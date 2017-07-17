const Variable = require('./variable');

function Stack(parent) {
  this.parent = parent || null;
  this.identifiers = {};
}

Stack.prototype.addItem = function addItem(identifier, item) {
  this.identifiers[identifier] = item;
};

Stack.prototype.findIdentifier = function findIdentifier(identifier) {
  const findAttempt = this.identifiers[identifier];

  if (findAttempt) {
    return findAttempt;
  }

  if (!this.parent) {
    return null;
  }

  return this.parent.findIdentifier(identifier);
};

module.exports = Stack;
