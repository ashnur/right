"use strict"
describe("right", function(){
    var expect, rat, right
        ;
    right = require('../right.js')
    rat = require('rats')
    expect = require('expect.js')
    it("should be a function", function() {
        return expect(right).to.be.an('function')
    })
    return it('should return rat objects after parsing strings', function() {
        var one, r, two
        one = rat(1)
        two = rat(2)
        r = right('1')
        expect(one).to.be(r)
        r = right('+1')
        expect(one).to.be(r)
        r = right('2')
        return expect(two).to.be(r)
    })
})
