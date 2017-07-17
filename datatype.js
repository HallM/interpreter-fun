// this will be a representation of the possible datatype(s) of a variable
// when an operation comes in, it applies it to all the possible types
// may also extend or narrow down over time

// needs to know what are "hard"/must have requirements vs what are soft

// ex a + b, could be string+string or number+number
// but 2 + a, a should be a number

function compareConditions(cond1, cond2) {
/*
conditions chould be represented as operations
(value)
(!value)
(l > r)
(l1 > r1 && l2 < r2)

but there's also equivalence checking
!!true == true
!true == !!false == false
(l > r) == (r < l)
(l > r) == !(l <= r)
(l && r) == !(!l || !r)

in order to properly support short circuit and order of execution,
the tree will contain single operations like (l > r)

in the case of
  (l1 > r1) && (l1 < r2)
if (l1 > r1) is false, then we cant say if the 2nd is true or false
we also probably cant make any non-strict type declarations
but if (l1 > r1) is true, then we can in fact say l1 and r1 are numbers
THEN we check (l1 < r2).

basically, we are going to pretend an IF statement supports only 1 op at a time
&& and || do not exist in this simple world and must be represented by more IFs

a && b then c else d:
if (a)
  if (b)
    c
  else
    d
else
  d
condition chain: [[a, b]]
else chain: [[!a], [!b]]

a || b then c else d:
if (a)
  c
else
  d
if (b)
  c
else
  d
condition chain: [[a], [b]]
else chain: [[!a, !b]]

another thing is "normalizing" conditions in order to make comparisons easier
- single items (l) should use an internal (l is truthy)
  - note (l) is NOT the same as (l == true)
  - ([]) is true, ([] == true) is false
- apply negations of operations, in the end no negations should exist
  - !(l is truthy) -> (l is falsey)
  - !(l < r) -> (l >= r)
  - !(l == r) -> (l != r)
  - !(l && r) -> (!l || !r) [need to apply the negation to the l and r]
    - this needs to be applied before refactoring && and || into more if's
- refactor && and || because of short circuiting
  - adjacent items in the tree are OR'd together
  - items under another item are AND'd together
  - when applying things, the application is applied every leaf in the tree
- need a decision on order
  - could stick to always using < and <=, never > and >=
  - but this doesnt work for ==/!=
  - could also use:
    - smallest literal left for 2 literals (alpha when strings same length)
    - any literal left for 1 literal
    - smallest identifier to the left
    - alpha comparison for identifier when identifiers are same length
  - NEVER re-arrange && and ||, because short-circuit
    - l && r is NOT the same as r && l, even if logically the same
    - if l is false, then r is not executed. but in the 2nd case, l is not when !r
*/
}

function ConditionTree(condition) {
  this.condition = condition;
  this.subConditions = [];
  this.possibleTypes = [];
}

ConditionTree.prototype.findInCondition = function findInCondition(conditionStack, offset) {
  if (conditionStack.length >= offset) {
    return this;
  }

  const cond = conditionStack[offset];
  const foundTree = this.subConditions.find(c => c.condition === cond);

  if (foundTree) {
    return foundTree;
  } else {
    return this.addCondition(conditionStack, offset);
  }
};

ConditionTree.prototype.addCondition = function addCondition(conditionStack, offset) {
  const cond = conditionStack[offset];
  const newTree = new ConditionTree(cond);
  this.subConditions.push(newTree);

  const nextIndex = offset + 1;
  if (conditionStack.length > nextIndex) {
    return newTree.addCondition(conditionStack, nextIndex);
  } else {
    return newTree;
  }
};

function DataType() {
  // the list of possible types and any information
  // and there might be conditions when a type is available
  this.possibleTypes = [];

  // this is a stack (rather a tree) of conditions and types/values for those conditions
  // each level can point to other conditions or to types/values
  this.conditionStack = new ConditionTree(null); // always start with one, no-condition
}

DataType.prototype.add = function add(conditionStack, otherValue) {
  // returns a list of rules that will be added
  // do we need a "maybe" "definite" ?
};

/*
Conditions needs to be a stack
because:

var x;
if (y === 3) {
  x = a + b;
  if (z === 5) {
    x = x - c;
  }
}

when y === 3:
  typeof y is number that is exactly 3 (or [3, 3] for ranges)
  typeof a === typeof x (for certain)
  typeof a is string(len:[0,+inf)) or number(-inf, +inf)
  typeof b is probably SHOULD be string(len:[0,+inf)) or number(-inf, +inf)
  typeof b probably SHOULD === typeof a
  typeof x is string(len:[0,+inf)) or number(-inf, +inf)

  further, when z === 5:
    when looking up x, we look up the "stack" of conditions: [y===3, z===5]
      - nothing in [y===3, z===5]
      - x has a def in [y===3], but c does not
      - c has a def in []
    typeof x is a number (because subtraction)
    typeof c is a number
    therefore, since typeof a === x, then a must be a number
    but ONLY if z === 5. it is PLAUSIBLE that z !== 5, thus these dont hold true

// this is still valid inputs
y = 3;
z = 0;
a = 'hello';
b = ' world';

// so is this
y = 3;
z = 1;
a = 3;
b = 7;

// and this
y = 3;
z = 5;
a = 3;
b = 7;
c = 1;

*/
