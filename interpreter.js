const Module = require('module');
const path = require('path');

const Stack = require('./stack');
const Variable = require('./variable');
const Func = require('./function');

const folderpath = path.resolve('node_modules/express/lib');
const filepath = path.join(folderpath, 'application.js');

// we have to make multiple passes anyway, due to the way hoisting works
// first pass, at a bare minimum, collects what identifiers exist and any definitions
// functions declared in a block that isnt the main fn-block are declared, but not defined
// this is the same as doing var fn = function() ...
// this phase would also collect all the functions to be scanned and maybe build a graph?
// that way

// TODO:
// tracking current "condition" stack
// proper way to track stack (no globals)
// needs to be wrapped and instantiated per AST
// research using a more SAX-like parser that is pausable
// that way, we can process as it reads in
// and pause it to process external resources
// should there be an external format to manage all the data? probably need to

// could pass the "current set of conditions" as a parameter
// hell, could do the same with the Stack
// that does work good for this style of parser, but does it work well for a streaming parser?

// another thought is to work in reverse:
// a node only defines it's required-conditions and effects (incl value)
// some nodes will "validate" conditions to remove those from continuing upward
// some nodes will add more conditions to the stack
// but how could this properly do "if (x) { return; } doStuff(x)" and know that x is falsy for doStuff?
// without translating into SESE form, a Current Condition/State has to be passed down

// the return of each node I suppose could be:
// any preconditions that node requires to run
// the "value" of the execution (which attached is all the potential values based on conditions)
// values can be a literal, a pointer (variable), could even have pointers to pointers to pointers
// any postconditions the node imparts on the state of things
// {
//   value: Value | null,
//   preconditions: [ PreCondition ],
//   postconditions: [ PostCondition ],
//   isAsync: true | false, // future thinking to handle async and race condition checking
//   joinedBy: ?? | null, // if async, what causes it to "join" back to the main chain? needs more thought
// }
//
// Value will contain the possible values and the conditions requires to reach each value
// also contains Type information
//
// PreCondition do not define how the return is influences, only what it REQUIRES to run
// example is "x(y)" REQUIRES that x is a function, it WILL NOT run any other way
// a PreCondition could have a set of conditions that it takes affect though!
// example "if (z) { x(y); }" only REQUIRES x is a function IF z is truthy
//
// PostCondition is the Effects of the running that particular code
// - Any Conditions that will be known after
// - Variable is modified (especially globals!)
// - Throws error
// - What about returns? breaks? continues?
// each PostCondition can also be bound by a set of Conditions in which it takes effect
// could also involve async behavior tracking. Async needs a lot more thought.
// Value could be seen as a type of PostCondition, but is separate

// TODO: future concept, a strictness configuration
// lower levels of strictness allow x > 7 and not care if x is a number at all
// higher levels of strictness start to require that x is a number

// TODO: processing of comments to allow users to set Assumptions or ignore errors

// TODO: processing of external Assumption files

// TODO: could we process Typescript Def or Flow Def files to add assumptions?

const rootStack = new Stack();
let currentStack = rootStack;

// negate logic, but leave everything else as is
function negateExpression(node) {
  if (node.type === 'UnaryExpression') {
    if (node.operator === '!') {
      // negation just cancels it
      return node.argument;
    } else {
      // TODO: need to verify, but i think ! is the only logic operator
      return node;
    }
  } else if (node.type === 'LogicExpression') {
    const operator = node.operator;

    if (operator === '&&') {
      return {
        type: 'LogicExpression',
        operator: '||',
        start: node.start,
        end: node.end,
        loc: node.loc,
        left: negateExpression(node.left),
        right: negateExpression(node.right)
      };
    } else if (operator === '||') {
      return {
        type: 'LogicExpression',
        operator: '&&',
        start: node.start,
        end: node.end,
        loc: node.loc,
        left: negateExpression(node.left),
        right: negateExpression(node.right)
      };
    } else {
      throw new Error('logic operator must be || or &&');
    }
  } else if (node.type === 'BinaryExpression') {
    const operator = node.operator;

    if (operator === '<') {
      return {
        type: 'BinaryExpression',
        operator: '>=',
        start: node.start,
        end: node.end,
        loc: node.loc,
        left: node.left,
        right: node.right
      };
    } else if (operator === '>') {
      return {
        type: 'BinaryExpression',
        operator: '<=',
        start: node.start,
        end: node.end,
        loc: node.loc,
        left: node.left,
        right: node.right
      };
    } else if (operator === '<=') {
      return {
        type: 'BinaryExpression',
        operator: '>',
        start: node.start,
        end: node.end,
        loc: node.loc,
        left: node.left,
        right: node.right
      };
    } else if (operator === '>=') {
      return {
        type: 'BinaryExpression',
        operator: '<',
        start: node.start,
        end: node.end,
        loc: node.loc,
        left: node.left,
        right: node.right
      };
    } else if (operator === '===') {
      return {
        type: 'BinaryExpression',
        operator: '!==',
        start: node.start,
        end: node.end,
        loc: node.loc,
        left: node.left,
        right: node.right
      };
    } else if (operator === '==') {
      return {
        type: 'BinaryExpression',
        operator: '!=',
        start: node.start,
        end: node.end,
        loc: node.loc,
        left: node.left,
        right: node.right
      };
    } else if (operator === '!==') {
      return {
        type: 'BinaryExpression',
        operator: '===',
        start: node.start,
        end: node.end,
        loc: node.loc,
        left: node.left,
        right: node.right
      };
    } else if (operator === '!=') {
      return {
        type: 'BinaryExpression',
        operator: '==',
        start: node.start,
        end: node.end,
        loc: node.loc,
        left: node.left,
        right: node.right
      };
    } else {
      // non logic, pass through.
      return node;
    }
  } else {
    // anything else is not logic
    return node;
  }
}

function handleVariableDeclarator(node) {
  const id = handleAny(node.id);
  const value = node.init ? handleAny(node.init) : null;

  // TODO: figure out the possible datatype(s)

  return currentStack.addItem(id, new Variable(id, value));
}

function handleSwitchCase(node) {
  const test = node.test ? handleAny(node.test) : null;
  const consequent = node.consequent.map(handleAny);

  // consequent may be empty array
  // it may not break (thus fallthrough)
  // even if there is a break, it may not ALWAYS break
  // therefore, a consequent runs if test is TRUE
  // but also is there is a fallthrough
  // test is null for default and only one can exist

  return 'case ' + (test || 'default');
}

const handlers = {
  'VariableDeclaration': function handleVariableDeclaration(node) {
    const kind = node.kind;
    // TODO: apply the kind to any variables (like const)

    return node.declarations.map(handleVariableDeclarator);
  },

  'FunctionDeclaration': function handleFunctionDeclaration(node) {
    const id = handleAny(node.id);
    const params = node.params.map(handleAny);

    // TODO: mark function, so that returns know how far up the chain to go
    const body = handleAny(node.body);

    // TODO: need to get the conditions of the function body
    // pull in any conditions
    // is there any conditions we can validate?

    // TODO: should this be a func or should everything be vars
    // and Func is simply a type?
    return currentStack.addItem(id, new Func(id, params, body));
  },

  'Identifier': function handleIdentifier(node) {
    const id = node.name;
    const foundItem = currentStack.findIdentifier(id);

    if (foundItem) {
      return foundItem;
    }

    // TODO: what is the best action for an undefined?
    // I think an alert + defining it internally to keep processing
    return currentStack.addItem(id, new Variable(id, undefined));
  },

  'ExpressionStatement': function handleExpressionStatement(node) {
    return handleAny(node.expression);
  },

  'BlockStatement': function handleBlockStatement(node) {
    const previousStack = currentStack;
    currentStack = new Stack(previousStack);

    // TODO: handling "hoisting" rules
    // the fact the identifier exists is always hoisted
    // variable initializers are never hoisted
    // functions directly in the function exist at all time
    //   therefore, functions are all known to each other, in any order
    // functions declared within another block only have the identifier hoisted and NOT the definition
    // the definition does not exist UNTIL the block is ran
    const ret = node.body.map(handleAny);

    // TODO: validate conditions that cannot bubble
    // and merge conditions that bubble up

    currentStack = previousStack;
    return ret;
  },

  'ThrowStatement': function handleThrowStatement(node) {
    const argument = handleAny(node.argument);
    // TODO: add post-condition throws
    return null;
  },

  'ReturnStatement': function handleReturnStatement(node) {
    const argument = node.argument ? handleAny(node.argument) : null;

    // TODO: add post-condition for return
    // find the containing function
    // determine the conditions from the entry to now
    // add a potential return to the function
    // for the remainder of the function,
    //   the condition-stack from function start to this point is false

    return '';
  },

  'TryStatement': function handleTryStatement(node) {
    const block = handleAny(node.block);
    const handler = node.handler ? handleAny(node.handler) : null;
    const finalizer = node.finalizer ? handleAny(node.finalizer) : null;

    // "confirm" that any "throw" post-condition will be caught

    return 'try+catch';
  },

  'CatchClause': function handleCatchClause(node) {
    const param = handleAny(node.param);
    const body = handleAny(node.body);

    // TODO: create a stack and add param to the stack

    return 'catch it';
  },

  'IfStatement': function handleIfStatement(node) {
    // TODO: start a "condition" stack

    const test = handleAny(node.test);
    const consequent = handleAny(node.consequent);
    const alternate = node.alternate ? handleAny(node.alternate) : null;

    // TODO: make sure to apply the condition stack to the consequent
    // and apply the negated condition to the alternate
    // TODO: is it possible to rewrite any LogicExpressions?
    // basically, (x && y) then c becomes (x) then (y) then c
    // (x || y) then c becomes (x) then c, (y) then c

    return 'do the if statement';
  },

  'WhileStatement': function handleWhileStatement(node) {
    const test = handleAny(node.test);
    const body = handleAny(node.body);

    // TODO: inside the body, we KNOW the test statement holds true
    // if there is no break:
    // then we know the condition is FALSE outside the body
    // but any break means the condition is FALSE or any condition leading to a break is TRUE

    return 'do the while statement';
  },

  'ForStatement': function handleForStatement(node) {
    const init = handleAny(node.init);
    const test = handleAny(node.test);
    const update = handleAny(node.update);

    const body = handleAny(node.body);

    // while inside the body, we KNOW test is true
    // after the for statement
    // either test is false OR break was called
    // is it possible to know the final value/range of anything inside
    // without knowing how many times the body was executed?

    return 'do the for statement';
  },

  'SwitchStatement': function handleSwitchStatement(node) {
    const discriminant = handleAny(node.discriminant);
    const cases = node.cases.map(handleSwitchCase);

    // using the discriminant, attempt to determine if the cases are exhaustive
    // need to be able to apply fallthrough here

    return 'swwwitch';
  },

  'BreakStatement': function handleBreakStatement(node) {
    const label = node.label ? handleAny(node.label) : null;

    // if there's a label, it should encapsulate this statement
    // if in a SwitchCase, then it involves fallthrough
    // for a loop, it breaks out of the loop

    return 'break ' + label;
  },

  'ContinueStatement': function handleContinueStatement(node) {
    const label = node.label ? handleAny(node.label) : null;

    // if there's a label, it should encapsulate this statement
    // continues the loop, but would still run the condition
    // TDOO: but what about a do-while, does continue skip it?

    return 'continue ' + label;
  },

  'LabeledStatement': function handleLabeledStatement(node) {
    const label = handleAny(node.label);
    const body = handleAny(node.body);

    return 'label ' + label;
  },

  'ConditionalExpression': function handleConditionalExpression(node) {
    const test = handleAny(node.test);
    const consequent = handleAny(node.consequent);
    const alternate = node.alternate ? handleAny(node.alternate) : null;

    // see if statement

    return '';
  },

  'MemberExpression': function handleMemberExpression(node) {
    const obj = handleAny(node.object);
    const prop = handleAny(node.property);

    // TODO: add a condition that obj must be a object
    // and that obj should have the property "prop" (though, not too necessary maybe?)
    // it could be they want: if(obj[prop])
    // but if it doesnt exist, we can just say it is undefined

    return 'get prop';
  },

  'BinaryExpression': function handleBinaryExpression(node) {
    const lhs = handleAny(node.left);
    const rhs = handleAny(node.right);
    const operator = node.operator;

    if (operator === '+') {
      // should be a string + string or number + number
      // z = x + y, typeof z === type of x
      // typeof y should match typeof x, but doesnt have to
    } else if (operator === '-') {
      // should be number - number
      // z = x - y, typeof all 3 should be number
      // otherwise, we will have NaN
      // its not FORCED, but they should do a NaN check otherwise
      // after all, x or y could be a string and still work
    } else if (operator === '*') {
      // math: same as -
    } else if (operator === '/') {
      // math: same as -
    } else if (operator === '%') {
      // math: same as -
    } else if (operator === '^') {
      // math(bitwise): same as -
      // z = x ^ y
      // all 3 should be 32-bit integers
      // range of −2,147,483,648 to 2,147,483,647
      // result will definitely be 32-bit integer
      // there is no NaN result
      // strings will be ran through parseInt and return 0 when fails
      // all other non integers, including NaN will be 0
    } else if (operator === '&') {
      // math(bitwise): same as ^
    } else if (operator === '<<') {
      // math(bitwise): same as ^
    } else if (operator === '>>') {
      // math(bitwise): same as ^
    } else if (operator === '>>>') {
      // math(bitwise): same as ^
    } else if (operator === '|') {
      // math(bitwise): same as ^
    } else if (operator === '<') {
      // math(comparison): mostly same as -
      // does constrain the potential range of the number
    } else if (operator === '>') {
      // math(comparison): same as >
    } else if (operator === '<=') {
      // math(comparison): same as <=
    } else if (operator === '>=') {
      // math(comparison): same as >=
    } else if (operator === '===') {
      // could be anything
      // if they are equal, we can say for sure that typeof lhs === typeof rhs
    } else if (operator === '==') {
      // we cant say for sure on the types, but the values are equal
    } else if (operator === '!==') {
    } else if (operator === '!=') {
    } else if (operator === 'instanceof') {
      // x instanceof y
      // x can be anything
      // y should be a class
      // if it is false, y may not be a class or x may not be of that type
    } else if (operator === 'in') {
      // for-in is completely different, so doesnt work in this
      // x in y
      // x can be anything
      // y should be an object
      // if true, then x is a property on y AND y is an object
    } else {
      throw new Error('unknown operator: ' + operator);
    }

    return 'do binary ' + operator;
  },

  'UnaryExpression': function handleUnaryExpression(node) {
    const operator = node.operator;
    const isPrefix = node.prefix;
    let value = handleAny(node.argument);

    // normalize the negation here?
    if (operator === '!') {
      value = handleAny(negateExpression(node.argument));
    } else if (operator === '-') {
      // y = -x, x should be a number
      // y will be a number
      // y will be NaN if x is not a number AND cannot be parsed into an number
      // y will have the negated range of x (if x is -3 to 7, then y is -7 to 3)
    } else if (operator === '+') {
      // y = -x, x should be a number
      // y will be a number
      // y will be NaN if x is not a number AND cannot be parsed into an number
      // range of y will be exact same of x
    } else if (operator === '~') {
      // y = ~x, x should be a 32-bit integer
      // y will be a 32-bit integer
      // y will not be nan
      // see same rules for ^ | & etc
    } else if (operator === 'typeof') {
      // y = typeof x
      // x can be anything
      // y will be a string that could be 'number', 'string', and others
    } else if (operator === 'void') {
      // no idea
    } else if (operator === 'delete') {
      // delete x
      // it CAN have a result in non-strict mode, but it is weird
      // so is SHOULD not have a result
      // but it does return a boolean
      // x can be anything, but should be a value within an object
      // the object containing x will no longer have the key which points to x
      // but only for the immediate parent, NOT a prototype
    } else {
      throw new Error('unknown unary operator: ' + operator);
      value = handleAny(node.argument);
    }

    return 'do unary ' + operator;
  },

  'UpdateExpression': function handleUpdateExpression(node) {
    const value = handleAny(node.argument);
    const operator = node.operator;
    const isPrefix = node.prefix;

    // both operators do the same thing:
    // ++x x++ --x x--
    // x should be a number
    // x CANNOT be a literal
    // result is a number or NaN if x is not an int or cannot be parsed into one
    // if lhs involves a global, then we must state we are modifying that global
    // if lhs involves an object+property or array+index, we state we modified the object
    // if lhs involves a parameter, we must state we modified the parameter

    return 'do updater ' + operator;
  },

  'AssignmentExpression': function handleAssignmentExpression(node) {
    const lhs = handleAny(node.left);
    const value = handleAny(node.right);
    const operator = node.operator;

    // if lhs involves a global, then we must state we are modifying that global
    // if lhs involves an object+property or array+index, we state we modified the object
    // the above ESPECIALLY for externals/parameters

    if (operator === '=') {
      // y = x
      // y must be a variable or some "assignable"
      // y will have the same value as x
      // typeof y will be === typeof x
      // at this point, we know x === y
    } else if (operator === '+=') {
      // x should be a number or string
      // y will be a string, number/NaN
      // if number y will have a shifted range of x
    } else if (operator === '-=') {
      // same as +, but must be a number
    } else if (operator === '*=') {
      // same as -
    } else if (operator === '/=') {
      // same as -
    } else if (operator === '%=') {
      // same as -
    } else if (operator === '<<=') {
      // similar to -, but also see rules for <<, ^, &, etc
    } else if (operator === '>>=') {
      // similar to -, but also see rules for <<, ^, &, etc
    } else if (operator === '>>>=') {
      // similar to -, but also see rules for <<, ^, &, etc
    } else if (operator === '|=') {
      // similar to -, but also see rules for <<, ^, &, etc
    } else if (operator === '^=') {
      // similar to -, but also see rules for <<, ^, &, etc
    } else if (operator === '&=') {
      // similar to -, but also see rules for <<, ^, &, etc
    } else {
      throw new Error('unknown assignment operator: ' + operator);
    }

    return 'assignment'
  },

  'NewExpression': function handleNewExpression(node) {
    const thingName = handleAny(node.callee);
    const args = node.arguments.map(handleAny);

    // new x
    // x probably should be a class and done via a function call
    // though, new x is possible, even though new x() is the most comment
    // result is an object that is typeof x
    // TODO: could this ever return null?

    return 'make new thing';
  },

  'ObjectExpression': function handleObjectExpression(node) {
    const properties = node.properties.map(handleAny);

    // creates a generic object (map-like)
    // we know it has the defined properties
    // typeof is just object
    // instanceof is just an object

    return 'new object';
  },
  'ObjectProperty': function handleObjectProperty(node) {
    const key = handleAny(node.key);
    const value = handleAny(node.value);
    return {key, value};
  },

  'FunctionExpression': function handleFunctionExpression(node) {
    const name = node.id ? handleAny(node.id) : null;
    const body = handleAny(node.body);

    // creates a function
    // should be used in something
    // if its by itself, then something isnt right
    // see same thing as function-declaration

    return 'new function';
  },

  'CallExpression': function handleCallExpression(node) {
    const functionName = handleAny(node.callee);
    const args = node.arguments.map(handleAny);

    if (functionName === 'require') {
      const requireItem = Module._resolveFilename(args[0], {
        id: filepath,
        filename: filepath,
        paths: Module._nodeModulePaths(folderpath)
      });

      // console.log('require in', requireItem);
    }

    // y = x(...)
    // x must be a function
    // look at x's preconditions and determine:
    // - do we match all the preconditions?
    // - if a precondition involves a parameter, then we can bubble that up
    // post conditions of the function call will be applied (like, globals being modified)
    // y will take on the type and value information of the result

    return 'do stuff';
  },

  'LogicalExpression': function handleLogicalExpression(node) {
    const op = node.operator;
    const lhs = handleAny(node.left);

    // result is technically "any"
    // not sure if

    if (operator === '&&') {
      // the condition the RHS executes under is that the lhs is truthy
      // if the lhs is falsy, rhs is never executed and is an unknown
    } else if (operator === '||') {
      // the condition the RHS executes under is that the lhs is falsy
      // if the lhs is truthy, rhs is never executed and is an unknown
    } else {
      throw new Error('unknown logical-expression operator: ' + operator);
    }

    const rhs = handleAny(node.right);

    // for &&:
    // resolves to RHS if LHS is truthy (no matter if RHS is truthy or falsy)
    // resolves to LHS if LHS is falsy (no joke, that really is what it does)

    // for ||:
    // resolves to LHS if LHS is truthy (completely ignores RHS)
    // resolves to RHS if LHS is falsy (no matter if RHS evalutes truthy or falsy)

    // the type of the expression depends on the type of the site it resolves to
    // '' && ANY resolves to ''
    // 0 && ANY resolves to 0
    // false && ANY resolves to false
    // null && ANY resolves to null
    // undefined && ANY resolves to undefined
    // TRUTHY && ANY resolves to the ANY
    // similar for ||, but with the OR rules instead of AND

    return null;
  },

  'ThisExpression': function handleThisExpression(node) {
    // need to make sure we are in a function
    // and that the function is called via an object(pre-condition)
    // or at least should be called with .call or .apply or used with .bind
    // this gets complicated:
    // an arrow pointer fn will keep this from the parent scope
    // for an object call x.y(), then this is x
    // for bind, y.bind(z)(), then this is z
    // for call/apply, y.call(c, ...), then this is c
    // otherwise, this will be part of the global scope (window in browser, TODO in node)
    return 'this';
  },

  'StringLiteral': function handleStringLiteral(node) {
    return node.value;
  },

  'NumericLiteral': function handleNumericLiteral(node) {
    return node.value;
  },

  'BooleanLiteral': function handleBooleanLiteral(node) {
    return node.value;
  },

  'NullLiteral': function handleNullLiteral(node) {
    return null;
  },

  // TODO: so many others to define
  /*
  RegExpLiteral
  EmptyStatement
  DebuggerStatement
  WithStatement
  DoWhileStatement
  ForInStatement
  ForOfStatement
  Super
  Import
  ArrowFunctionExpression
  YieldExpression
  AwaitExpression
  ArrayExpression
  SequenceExpression
  DoExpression

  TemplateLiteral
  TaggedTemplateExpression
  TemplateElement

  ClassBody
  ClassMethod
  ClassProperty
  ClassPrivateProperty
  ClassDeclaration
  ClassExpression
  MetaProperty

  ImportDeclaration
  ImportSpecifier
  ImportDefaultSpecifier
  ImportNamespaceSpecifier
  ExportNamedDeclaration
  ExportSpecifier
  ExportDefaultDeclaration
  ExportAllDeclaration
  */
}

// let showMore = true;
function handleAny(node) {
  const type = node.type;

  const handler = handlers[type];

  if (handler) {
    return handler(node);
  }

  console.log('unhandled:', node.type);
  // if (showMore) {
  //   showMore = false;
  //   console.log(node);
  //   console.log(JSON.stringify(node, null, 2));
  // }

  return null;
}

module.exports = handleAny;
