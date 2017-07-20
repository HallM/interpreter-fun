'use strict'

// basically an array literal
exports.validate = function validateArrayExpression(state, node) {
  // preconditions: whatever is underneath
  // postconditions: this thing is an array. also, stuff about what is inside

  const stateAfterElements = node.elements.reduce(parseArrayElement, state);

  let allPreConditions = [];
  let allPostConditions = [];
  const elementTypes = [];

  let exactValue = [];

  node.elements.forEach(function(element) {
    const element = elements[i];
    const {
      preConditions,
      value,
      nextState,
      postConditions
    } = validateArrayElement(state, element);

    if (exactValue != null) {
      if (value.hasExactValue) {
        exactValue.push(value.exactValue);
      }
    }

    // bubble pre conditions up
    allPreConditions = allPreConditions.concat(preConditions);

    // record all possible types into the array
    // but do not bother with any conditions
    const valueTypes = value.getAllTypes();
    valueTypes.forEach(function(type) {
      if (elementTypes.indexOf(type) === -1) {
        elementTypes.push(type);
      }
    });

    // the rest of the post conditions just bubble up
    allPostConditions = allPostConditions.concat(postConditions);

    state = nextState;
  });

  const valueSettings = exactValue != null ? {
    type: new ArrayType(
      elementTypes,
      ArrayValue.IS_EXACT_LENGTH,
      node.elements.length
    ),
    exactValue: exactValue
  } : {
    possibles: [
      new Conditionally(
        null, // applies to every condition
        new ArrayType(
          elementTypes,
          ArrayValue.IS_EXACT_LENGTH,
          node.elements.length
        )
      )
    ]
  };

  const arrayValue = new Value(valueSettings);

  return {
    preConditions: allPreConditions,
    postConditions: allPostConditions,
    value: arrayValue,
    nextState: state
  };
};

function validateArrayElement(state, node) {
  return validateExpression(state, node);
}
