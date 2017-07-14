const Range = require('../range');

function ArrayType() {
  // we know that it starts off with an exact value
  this.possibleLength = new Range(0, 0, true, true);

  // try to track the types of data within the array?
  this.dataTypes = null;
}

module.exports = ArrayType;
