'use strict'

// basically an array literal
exports.validate = function validateArrayExpression(state, node) {
  // preconditions: the lhs is a valid, declared, non-const LValue, everything from the rhs
  // postconditions: the lhs type is same as rhs type.
  //    lhs is exactly rhs (useful for knowing x=y, thus x can be used in place of y)
  //    also, some operator specific stuff

  const operator = node.operator;

  // the operator itself doesnt impose any preconditions on the right
  // right hand side is always executed before left
  const rightResult = validateRValue(state, node.right);

  state = rightResult.state;

  const leftResult = validateLValue(state, node.left);

  state = leftResult.state;

  // make sure if the left is decomp, that the right matches
  // make sure left is declared
  // we must know for sure the left exists in the scope

  switch (operator) {
    case '=': {
      // set left value to right
      // return that value as well
      break;
    }

    case '+=': {
      // rhs must evaluate to string or number
      // lhs must be also be string or number
      // lhs and rhs must be the same type
      break;
    }

    case '*=': {
      // both lhs and rhs must be number
      break;
    }
    case '/=': {
      // both lhs and rhs must be number
      break;
    }
    case '%=': {
      // both lhs and rhs must be number
      break;
    }
    case '-=': {
      // both lhs and rhs must be number
      break;
    }
    case '<<=': {
      // both lhs and rhs must be number
      break;
    }
    case '>>=': {
      // both lhs and rhs must be number
      break;
    }
    case '>>>=': {
      // both lhs and rhs must be number
      break;
    }
    case '|=': {
      // both lhs and rhs must be number
      break;
    }
    case '&=': {
      // both lhs and rhs must be number
      break;
    }
    case '^=': {
      // both lhs and rhs must be number
      break;
    }
  }


};

function validateLValue(state, node) {
  return validateExpression(state, node);
}

function validateRValue(state, node) {
  return validateExpression(state, node);
}
