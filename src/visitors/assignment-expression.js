'use strict'

const parseExpression = require('../parse-expression');

// basically an array literal
exports.validate = function validateArrayExpression(state, node) {
  // preconditions: the lhs is a valid, declared, non-const LValue, everything from the rhs
  // postconditions: the lhs type is same as rhs type.
  //    lhs is exactly rhs (useful for knowing x=y, thus x can be used in place of y)
  //    also, some operator specific stuff

  const operator = node.operator;

  const left = parseLValue(node.left);
  const right = parseRValue(node.right);

};

function parseLValue(node) {
  return parseExpression(node);
}

function parseRValue(node) {
  return parseExpression(node);
}
