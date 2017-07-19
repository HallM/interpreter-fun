'use strict'

// basically an array literal
exports.validate = function validateArrayExpression(state, node) {
  // preconditions: whatever is underneath
  // postconditions: this thing is an array. also, stuff about what is inside

  const stateAfterElements = node.elements.reduce(parseArrayElement, state);

  const internalPreConditions = elements.map(e => e._preConditions).reduce(flatten);
  const internalPostConditions = elements.map(e => e._postConditions).reduce(flatten);

  // we don't really track further conditions beyond what elements are *possibly* in the array at this time
  // would be cool, but dynamic insertions would make it impossible to know which is what type
  const elementTypes = internalPostConditions.filter(isTypePostCondition).reduce(dedupTypes);

  // all post conditions which affect state are carried up
  const affectors = internalPostConditions.filter(isAffectorPostCondition).reduce(dedupValues);

  node._preConditions = internalPreConditions;

  node._postConditions = [
    new KnownPossibleTypes(
      [ new ArrayType(elementTypes, ArrayType.IS_EXACT, elements.length) ]
    )
  ].concat(affectors);

  return node;
};

function validateArrayElement(state, node) {
  return validateExpression(state, node);
}
