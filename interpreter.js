const Module = require('module');
const path = require('path');

const folderpath = path.resolve('node_modules/express/lib');
const filepath = path.join(folderpath, 'application.js');

let showMore = true;

const handlers = {
  'VariableDeclaration': function handleVariableDeclaration(node) {
    const kind = node.kind;

    return node.declarations.map(handleAny);
  },

  'VariableDeclarator': function handleVariableDeclarator(node) {
    const id = handleAny(node.id);
    const value = node.init ? handleAny(node.init) : undefined;

    return {id, value};
  },

  'FunctionDeclaration': function handleFunctionDeclaration(node) {
    const id = handleAny(node.id);
    const params = node.params.map(handleAny);
    const body = handleAny(node.body);

    return 'function ' + id;
  },

  'Identifier': function handleIdentifier(node) {
    return node.name;
  },

  'ExpressionStatement': function handleExpressionStatement(node) {
    return handleAny(node.expression);
  },

  'BlockStatement': function handleBlockStatement(node) {
    return node.body.map(handleAny);
  },

  'ThrowStatement': function handleThrowStatement(node) {
    const argument = handleAny(node.argument);
    return '';
  },

  'ReturnStatement': function handleReturnStatement(node) {
    const argument = node.argument ? handleAny(node.argument) : undefined;
    return '';
  },

  'TryStatement': function handleTryStatement(node) {
    const block = handleAny(node.block);
    const handler = node.handler ? handleAny(node.handler) : null;
    const finalizer = node.finalizer ? handleAny(node.finalizer) : null;

    return 'try+catch';
  },

  'CatchClause': function handleCatchClause(node) {
    const param = handleAny(node.param);
    const body = handleAny(node.body);

    return 'catch it';
  },

  'IfStatement': function handleIfStatement(node) {
    const test = handleAny(node.test);
    const consequent = handleAny(node.consequent);
    const alternate = node.alternate ? handleAny(node.alternate) : null;

    return 'do the if statement';
  },

  'WhileStatement': function handleWhileStatement(node) {
    const test = handleAny(node.test);
    const body = handleAny(node.body);

    return 'do the while statement';
  },

  'ForStatement': function handleForStatement(node) {
    const init = handleAny(node.init);
    const test = handleAny(node.test);
    const update = handleAny(node.update);

    const body = handleAny(node.body);

    return 'do the for statement';
  },

  'SwitchStatement': function handleSwitchStatement(node) {
    const discriminant = handleAny(node.discriminant);
    const cases = node.cases.map(handleAny);

    return 'swwwitch';
  },

  'SwitchCase': function handleSwitchCase(node) {
    const test = node.test ? handleAny(node.test) : null;
    const consequent = node.consequent.map(handleAny);

    return 'case ' + (test || 'default');
  },

  'BreakStatement': function handleBreakStatement(node) {
    const label = node.label ? handleAny(node.label) : null;
    return 'break ' + label;
  },

  'ContinueStatement': function handleContinueStatement(node) {
    const label = node.label ? handleAny(node.label) : null;
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

    return '';
  },

  'MemberExpression': function handleMemberExpression(node) {
    const obj = handleAny(node.object);
    const prop = handleAny(node.property);

    return 'get prop';
  },

  'BinaryExpression': function handleBinaryExpression(node) {
    const lhs = handleAny(node.left);
    const rhs = handleAny(node.right);
    const operator = node.operator;

    if (operator === '+') {
    } else if (operator === '-') {
    }

    return 'do binary ' + operator;
  },

  'UnaryExpression': function handleUnaryExpression(node) {
    const value = handleAny(node.argument);
    const operator = node.operator;

    return 'do unary ' + operator;
  },

  'UpdateExpression': function handleUpdateExpression(node) {
    const value = handleAny(node.argument);
    const operator = node.operator;
    const isPrefix = node.prefix;

    return 'do updater ' + operator;
  },

  'AssignmentExpression': function handleAssignmentExpression(node) {
    const lhs = handleAny(node.left);
    const value = handleAny(node.right);
    const operator = node.operator;

    return 'assignment'
  },

  'NewExpression': function handleNewExpression(node) {
    const thingName = handleAny(node.callee);
    const args = node.arguments.map(handleAny);

    return 'make new thing';
  },

  'ObjectExpression': function handleObjectExpression(node) {
    const properties = node.properties.map(handleAny);
    return 'new object';
  },

  'FunctionExpression': function handleFunctionExpression(node) {
    const name = node.id ? handleAny(node.id) : undefined;
    const body = handleAny(node.body);
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

    return 'do stuff';
  },

  'LogicalExpression': function handleLogicalExpression(node) {
    const op = node.operator;
    const lhs = handleAny(node.left);
    const rhs = handleAny(node.right);
    return null;
  },

  'ObjectProperty': function handleObjectProperty(node) {
    const key = handleAny(node.key);
    const value = handleAny(node.value);
    return {key, value};
  },

  'ThisExpression': function handleThisExpression(node) {
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
}

function handleAny(node) {
  const type = node.type;

  const handler = handlers[type];

  if (handler) {
    return handler(node);
  }

  console.log(node.type);
  // if (showMore) {
  //   showMore = false;
  //   console.log(JSON.stringify(node, null, 2));
  // }

  return null;
}

module.exports = handleAny;
