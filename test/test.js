"use strict";

describe("right", function() {
  var expect, nmbr, right;
  right = require(__dirname + '/../right.js');
  nmbr = require(__dirname + '/../node_modules/nmbr/index.js');
  expect = require('expect.js');
  it("should be a function", function() {
    return expect(right).to.be.an('function');
  });
  return it('should return nmbr objects after parsing strings', function() {
    var one, r, two;
    one = nmbr(1);
    two = nmbr(2);
    r = right('1');
    expect(one).to.be(r);
    r = right('+1');
    expect(one).to.be(r);
    r = right('2');
    return expect(two).to.be(r);
  });
});
