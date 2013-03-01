describe("piper", function(){
    var p, piper, expect ;
    expect = require('expect.js')
    p = piper = require(__dirname + '/../index.js')
    function riser(to){
        var a = [], i;
        for ( i=0; i<to-1; i++ ){ a[i] = 0 }
        a[i] = 1
        return a
    }

    alpha = p([0,1])
    square = p([0,0,1])
    cube = p([0,0,0,1])
    it("should exist as a factory function", function(){
        expect(piper).to.be.a('function')
    })
    it("should require an argument, and use it for creating a polynumber", function(){
        expect(piper).to.throwException(/invalid argument/)
    })
    it("should return a polynumber function", function(){
        expect(square).to.be.an('object')
    })
    it("should have a list, which size determines it's degree", function(){
        expect(square.degree()).to.be.a('number')
        expect(square.degree()).to.equal(2)
        expect(cube.degree()).to.equal(3)
    })
    it("basic operations should work", function(){
        expect(p([1,1]).pow(2)).to.equal(p([1,2,1]))
        expect(p([1,1]).pow(2)+'').to.equal(p([1,2,1])+'')
        expect(p([1,-1]).pow(2)).to.equal(p([1,-2,1]))
        expect(p([1,1]).pow(3)).to.equal(p([1,3,3,1]))
        expect(p([1,-1]).pow(3)).to.equal(p([1,-3,3,-1]))
        expect(p([1,2]).pow(2)).to.equal(p([1,2]).val(p([0,2,2])))
        expect(p([2]).pow(2)).to.equal(p([4]))
        expect(p([5]).pow(3)).to.equal(p([125]))
        expect(p([5]).times(p([25]))).to.equal(p(cube.val([5])))
        expect(p([1,2,3,4,5]).val([1])).to.equal(p([15]))
        expect(p([2,2,3,4,5]).val([2])).to.equal(p([130]))
        expect(p([4,2,3,4,5]).val([3])).to.equal(p([550]))
        expect(p([0,1]).pow(2)).to.equal(p([0,0,1]))
        expect(p([0,1]).pow(9)).to.equal(p([0,0,0,0,0,0,0,0,0,1]))
    })
    it("operations between polynumbers", function(){
        expect(p([2,3,4,5,69,11]).minus(p([1,2,3,4,68,11]))+'').to.equal(p([1,1,1,1,1])+'')
        expect(p([2,3,4,5,69,11]).minus(p([1,2,3,4,68,11]))).to.equal(p([1,1,1,1,1]))
        expect(p([2,3,4]).plus(p([1,2,3]))).to.equal(p([3,5,7]))
        expect(p([1,-1]).times(p([1,1]))).to.equal(p([1,0,-1]))
        expect(p([1,-1]).times(p([1,1,1]))).to.equal(p([1,0,0,-1]))
        expect(p([1,1]).times(p([1,-1,1]))).to.equal(p([1,0,0,1]))
        expect(alpha.plus(alpha)).to.equal(p([0,2]))
        expect(square.minus(alpha)).to.equal(p([0,-1,1]))
        expect(square.times(alpha)).to.equal(cube)
        expect(p([2,0,13]).plus(p([1,4]))).to.equal(p([3,4,13]))
        expect(p([2,0,13]).times(p([1,4]))).to.equal(p([2,8,13,52]))
        expect(p([3,-1,0,1]).plus(p([-1,2]))).to.equal(p([2,1,0,1]))
        expect(p([3,-1,0,1]).times(p([-1,2]))).to.equal(p([-3,7,-2,-1,2]))
        expect(p([1,-1]).times(p([1,1,1]))).to.equal(p([1,0,0,-1]))
        expect(p([1,0,-1]).pow(2).plus(p([0,2]).pow(2))).to.equal(p([1,0,1]).pow(2))
        expect(p([2,-3,0,1]).val([4]).plus(p([1,-5]).val([4]))).to.equal(p([2,-3,0,1]).plus(p([1,-5])).val([4]))
        expect(p([2,-3,0,1]).val([4]).times(p([1,-5]).val([4]))).to.equal(p([2,-3,0,1]).times(p([1,-5])).val([4]))

    })
    it("rational polynumbers", function(){
        var tpr, tpr2;
        debugger
        tpr = p([2,7,2,-3]).per(p([2,1,-1]))
        tpr2 = p([8,10,-5,3]).per(p([-3,2,1]))

        expect(tpr).to.equal(p(p([2,7,2,-3]),p([2,1,-1])))
        expect(tpr+'').to.equal(p([1,3])+'')
        expect(tpr).to.equal(p([1,3]))
        expect(p([-1,1]).times(p([3,1]))).to.equal(p([-3,2,1]))

        expect(tpr.plus(tpr2)+'').to.equal(p([5,3,2,6]).per(p([-1,1]).times(p([3,1])))+'')
        expect(tpr.minus(tpr2)+'').to.equal(p([-11,-17,12]).per(p([-3,2,1]))+'')
        expect(tpr.times(tpr2)).to.equal(p([8,34,25,-12,9]).per(p([-3,2,1])))
        expect(tpr.per(tpr2)).to.equal(p([-3,-7,7,3]).per(p([8,10,-5,3])))
        expect(tpr2.per(tpr)).to.equal(p([8,10,-5,3]).per(p([-3,-7,7,3])))
        debugger
        var cf1 = p.rndp(1,2)
            , cf2 =  p.rndp(2,3)
            , t1 = p.rndp(2,3).times(cf1).times(cf2)
            , t2 = p.rndp(1,2).times(cf1).times(cf2)
            , t3 = p(t1,t2)

            ;
        //console.log(t1.per(t2))
        //console.log(t1.toPolynom('x'))
        //console.log(t2.toPolynom('x'))
        //console.log(t3.toPolynom('x'))
        expect(p([4,16,44,92,80,52]).per(p([-16,-40,-88,-120,40,88,136])))
                .to.equal(p([1,3,7,13],[-4,-6,-12,-12,34]))
        expect(p([-1,0,0,1]).per(p([-3,3]))).to.equal(p([1,1,1]).per(p([3])))
        debugger
        expect(p([1],[0,1]).plus(p([1],[0,0,1]))).to.equal(p([1,1],[0,0,1]))
        expect(p([1],[0,0,1]).plus(p([1],[0,0,0,1])).plus(p([1],[0,0,0,0,1]))
                ).to.equal(p([1,1,1],[0,0,0,0,1]))
        expect(p([0,0,0,1,0,-2,0,1],[0,0,0,0,0,0,0,0,-1,1])).to.equal(
                p([-1,-1,1,1],[0,0,0,0,0,1]))

    })
    it("composition  & translation of integer polynumbers", function(){
        var q = p([1,3,4]), r = p([2,1]), m = p(riser(10)), n = p(riser(13));
        expect(q.val([1])).to.equal(p([8]))
        expect(q.val([2])).to.equal(p([23]))
        expect(q.val([-1])).to.equal(p([2]))
        expect(q.val(r)).to.equal(p([23,19,4]))
        expect(q.val(r)).to.not.equal(r.val(q))
        expect(m.val(n)).to.equal(n.val(m))
        expect(q.degree()*r.degree()).to.equal(q.val(r).degree())
        expect(m.degree()*n.degree()).to.equal(m.val(n).degree())

        expect(q.leftTr(1)).to.equal(p([8,11,4]))
        expect(q.leftTr(2)).to.equal(p([23,19,4]))
        expect(q.leftTr(3)).to.equal(p([46,27,4]))
        expect(q.leftTr(-1)).to.equal(p([2,-5,4]))
        expect(q.leftTr(37)).to.equal(p([5588,299,4]))
        expect(q.leftTr(3).leftTr(5)).to.equal(q.leftTr(8))


    })
})
