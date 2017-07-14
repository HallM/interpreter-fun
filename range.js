function Range(min, max, minInclusive, maxInclusive) {
  this.min = min;
  this.max = max;
  this.minInclusive = minInclusive;
  this.maxInclusive = maxInclusive;
}

Range.prototype.extend = function extend(range) {
  if (range.min < this.min) {
    // if the range has a smaller min, then we replace it completely
    this.min = range.min;
    this.minInclusive = range.minInclusive;
  } else if (range.min === this.min) {
    // if the min is the same, we use the "most permissive" inclusion of the two
    this.minInclusive = this.minInclusive || range.minInclusive;
  }

  // do the same to the max
  if (range.max > this.max) {
    this.max = range.max;
    this.maxInclusive = range.maxInclusive;
  } else if (range.max === this.max) {
    this.maxInclusive = this.maxInclusive || range.maxInclusive;
  }

  return this;
};

Range.prototype.isRangeWithin = function isRangeWithin(range) {
  if (range.min < this.min) {
    return false;
  }

  if (range.min === this.min && (this.minInclusive || !range.minInclusive)) {
    return false;
  }

  if (range.max > this.max) {
    return false;
  }

  if (range.max === this.max && (this.maxInclusive || !range.maxInclusive)) {
    return false;
  }

  return true;
};

Range.prototype.isValueWithin = function isValueWithin(value) {
  if (value < this.min) {
    return false;
  }

  if (!this.minInclusive && value === this.min) {
    return false;
  }

  if (value > this.max) {
    return false;
  }

  if (!this.maxInclusive && value === this.max) {
    return false;
  }

  return true;
};

module.exports = Range;
