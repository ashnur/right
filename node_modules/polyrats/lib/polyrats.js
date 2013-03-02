void function(root){
    "use strict"

    var pns = {}
        , rats = require('rationals')
        ;

    function isInt(input){
        return typeof input !== 'object' && parseInt(input, 10) == input
    }


    function convertToInt(input){
        if ( isInt(input) ) {
            return parseInt(input, 10)
        } else {
            throw new Error('bad format: '+input+(' ('+typeof input+')'))
        }
    }

    function lefttrim(arr, maxDrop){
        if ( maxDrop == null ) maxDrop = arr.length-1
        while ( arr.length > 1 && arr[0] === 0 && maxDrop > 0 ) {
            arr.shift()
            maxDrop--
        }
        return arr
    }

    function righttrim(arr){
        while ( arr.length > 1 && arr[arr.length-1] === 0  ) {
            arr.pop()
        }
        return arr
    }

    function largestNonZeroIndex(arr){
        var len = arr.length
            , i, t;
        for ( i=0; i<len; i++ ) {
            if ( Math.abs(arr[i]) > 0) {
                if ( t === undefined ) t = 0
                if ( i > t ) t = i
            }
        }
        return t
    }

    function alpha(pow){
        pow = pow == null ? 1 : pow
        var a=[], i = pow;
        while ( i-- > 0 ) { a.push(0) }
        a.push(1)
        return a
    }

    function rand(max, min){
        var r =  Math.floor(Math.random() * (max - min + 1)) + min;
        return  r == 0 ?  rand(max, min) : r
    }

    function rndp(mindeg, maxdeg, pure){
        pure = pure != null ? false : pure

        var deg = rand(maxdeg == null ? 6 : maxdeg, mindeg == null ? 3 : mindeg)
            , base = alpha(deg)
            , common_factor = rand(13, -13)
            ;

        return piper(base.map(function(){
            var coefficient = rand(13, -13)
                ;
            return pure ? coefficient : coefficient * common_factor
        }))
    }

    function degree(arr){
        if ( arr == null && this == null ) {
            throw new Error('missing argument')
        }

        var arr = (arr == null) ? this : arr
            , numerator_degree, denominator_degree
            ;

        if ( arr instanceof polyrat ) {
            numerator_degree = largestNonZeroIndex(arr[0])
            denominator_degree = largestNonZeroIndex(arr[1])
            return numerator_degree > denominator_degree
                                ? numerator_degree
                                : denominator_degree
        } else if ( Array.isArray(arr) ) {
            return largestNonZeroIndex(arr)
        } else {
            throw new Error('dafuq')
        }
    }


    function divide(a, b){
        var remainder, divisor, k, j, quotient=[]
            , adeg = degree(a), bdeg = degree(b)
            ;

        remainder = a.slice(0)
        divisor = b.slice(0)

        for ( k = adeg - bdeg ; k >= 0 ; k-- ) {
            quotient[k] = Math.floor(remainder[bdeg+k]/divisor[bdeg])
            for ( j = bdeg + k  ; j >= k ; j-- ) {
                remainder[j] = remainder[j]-(quotient[k]*divisor[j-k])
            }
        }

        quotient = righttrim(quotient)
        remainder = righttrim(remainder)

        return [quotient, remainder]
    }


    function gcd(a, b){
        var result = []
            , i = 1
            , deg_current , deg_last
            , lead_current , lead_last
            , divisor
            , shifts = [[0],[0]]
            , gcd
            ;
        // if any of the elements is 1, return 1 imediatelly
        if ( (a.length == 1 && a[0] == 1) || (b.length == 1 && b[0] == 1) ) {
            return piper([1])
        }
        // current element should be the smaller one
        // last element should be the larger one
        if ( degree(a) >= degree(b) ) {
            result[0] = a
            result[1] = b
        } else {
            result[0] = b
            result[1] = a
        }
        while ( result[i] != 0 ) {
            // degrees of the last and the current elements
            deg_last = degree(result[i-1])
            deg_current = degree(result[i])

            // raise the current element to the same power as the last element
            result[i] = piper(result[i]).times(piper(alpha(deg_last-deg_current)))[0]
            shifts[i%2].push(deg_last-deg_current)

            // get the leading coefficient for the last and current element
            lead_last = result[i-1][result[i-1].length-1]
            lead_current = result[i][result[i].length-1]

            // multiply the last and current element with the lead coefficients
            result[i-1] = result[i-1].map(function(c){return c*lead_current})
            result[i] = result[i].map(function(c){return c*lead_last})

            // calculate the gcd of all the coefficients from the elements
            divisor = result[i].concat(result[i-1]).reduce(
                function(p,c){
                    return p===0?c:(rats.gcd(p,c))
                }
            )

            // divide the last two elements with the gcd
            result[i-1] = result[i-1].map(function(c){return c/divisor})
            result[i] = result[i].map(function(c){return c/divisor})

            // calculate the difference between the last and current elements and
            // drop off the highest power, now zero coefficients
            result[i+1] = righttrim(result[i-1].map(function(c,j){return c - result[i][j]}))

            i++

            // if we are past 2 iterations and nothing changed
            // there is no gcd, return 1
            if ( result.length > 3 && piper(result[i]) == piper(result[i-2]) && piper(result[i-1]) == piper(result[i-3]) ) {
                return piper([1])
            }
        }
        // drop off all the smaller coefficients of 0 which
        // were introduced by raising
        return piper(lefttrim(result[i-1], shifts[(i-1)%2].reduce(function(x,y){return x + y})))
    }

    function hashify(){
        return '['+this[0].join(',')+']/['+this[1].join(',')+']'
    }

    function display(){
        //rats display el van baszodva
        //console.log(rats(this[0][0], this[1][0]).display()) // rahhh
        return this.degree() === 0
                ? rats(this[0][0], this[1][0]).display()
                : '['+this[0].join(',')+']/['+this[1].join(',')+']'
    }

    function toPolynom(α){
        α = α == null ? 'α' : α
        function nom(v){
            return v.map(function(c,i){
                var O, C, B, P, ac = Math.abs(c);
                O =  ( i == v.length-1 || ac == 0 ) ? '' : c < 0 ? '-' : '+'
                C = ( ac == 0 || ( i > 0 && ac == 1 ) ) ? '' : ac
                B = ( i == 0 || ac == 0 ) ? '' : (ac == 1 ? '' : '*')+α
                P = (i == 0 || i == 1 || ac == 0) ? '' : '^'+i
                return O + C + B + P
            }).reverse().join('')
        }
        return '('+nom(this[0])+')/('+nom(this[1])+')'
    }

    function plus(first, second){
        var len, i, left, right, result=[];

        len = first.length > second.length ? first.length : second.length

        for ( i = 0; i < len; i++ ) {
            left = first[i] !== undefined ? first[i] : 0
            right = second[i] !== undefined ? second[i] : 0
            result[i] = left+right
        }
        return result
    }

    function minus(first, second){
        var len, i, left, right, result=[];
        len = first.length > second.length ? first.length : second.length
        for ( i = 0; i < len; i++ ) {
            left = first[i] !== undefined ? first[i] : 0
            right = second[i] !== undefined ? second[i] : 0
            result[i] = left-right
        }
        return result
    }

    function times(first, second){
        var p, plen, q, qlen, i, j, result=[];
        p = first.slice(0)
        plen = first.length
        q = second.slice(0)
        qlen = second.length
        for ( i=0; i<plen; i++ ) {
            for ( j=0; j<qlen; j++ ) {
                if ( result[i+j] === undefined ) result[i+j] = 0
                if ( p[i+j] === undefined ) p[i+j] = 0
                if ( q[i+j] === undefined ) q[i+j] = 0
                result[i+j] = result[i+j]+(p[i]*q[j])
            }
        }
        return result
    }

    function per(first, second){
        var result
            , f = first instanceof polyrat
            , s = second instanceof polyrat
            , t = null
            ;
        if ( f && s ) {
            throw new Error ('wtf')
            result = divide(first, second)
        //} else if ( f && !s) {
        //    result = input.per(piper(second))
        //} else if ( !f && s) {
        //    result = piper(input).per(second)
        } else {
            result = piper(first, second)
        }
        return result
    }

    function pow(first, second){
        var i, result=[];
        if ( ! isInt( second ) ) {
            throw new Error('undefined operation, look for roots elsewhere')
        }
        i=0
        result = first
        if ( second !== 0 ) {
            while ( ++i < second ) {
                result = result.times(first)
            }
        } else {
            result = piper([1])
        }
        return result
    }

    function val(first, second){
        var n = piper([0])
            , d = piper([0])
            , len
            , i
            , t1
            , t2
            ;
        if ( ! ( second instanceof polyrat ) ) {
            if ( Array.isArray(second) ) {
                second = piper(second)
            } else {
                second = piper([second])
            }
        }
        len = first[0].length
        for ( i=0; i < len; i++ ) {
            t1 = piper([first[0][i]])
            t2 = piper(second.pow(i))
            n = n.plus(t1.times(t2))
        }
        len = first[1].length
        for ( i=0; i < len; i++ ) {
            t1 = piper([first[1][i]])
            t2 = piper(second.pow(i))
            d = d.plus(t1.times(t2))
        }
        return piper(n, d)
    }

    function polyrat(){}

    polyrat.prototype.hashify = display

    polyrat.prototype.toString = display

    polyrat.prototype.degree = degree

    polyrat.prototype.display = display

    polyrat.prototype.toPolynom = toPolynom


    polyrat.prototype.plus = function(input){
        var p = this[0]
            , q = this[1]
            , r = input[0]
            , s = input[1]
            ;
        return per(plus(times(p, s), times(r, q)), times(q, s))
    }

    polyrat.prototype.minus = function(input){
        var p = this[0]
            , q = this[1]
            , r = input[0]
            , s = input[1]
            ;
        return per(minus(times(p, s), times(r, q)), times(q, s))
    }
    polyrat.prototype.times = function(input){

        var p = this[0]
            , q = this[1]
            , r = input[0]
            , s = input[1]
            , n = times(p, r)
            , d = times(q, s)
            ;

        return per(n, d)
    }
    polyrat.prototype.pow = function (input){
        return pow(this, input)
    }
    polyrat.prototype.val = function (input){
        return val(this, input)
    }
    polyrat.prototype.per = function (input){
        var p = this[0]
            , q = this[1]
            , r = input[0]
            , s = input[1]
            , n = times(p, s)
            , d = times(r, q)
            ;
        return per(n, d)
    }
    polyrat.prototype.divide = function (input){
        return divide(this, input)
    }
    polyrat.prototype.leftTr = function (input){
        return val(this,piper([input,1]))
    }
    polyrat.prototype.compose = function (input){
        return compose(this, input)
    }


    function piper(numerator, denominator){
        var key, idx, t, len, i, n, j, d, intvals, dd, divisor;

        if ( numerator instanceof polyrat ) {
            if ( denominator == null ) {
                return numerator
            } else if ( denominator instanceof polyrat) {
                n = times(numerator[0], denominator[1])
                d = times(denominator[0], numerator[1])
                numerator = n
                denominator = d
            }
        }

        if ( ! Array.isArray(numerator) ) {
            throw new Error('invalid argument, array expected instead of '+
                    numerator+' ('+typeof numerator+')')
        } else {
            numerator = numerator.map(convertToInt)
        }

        denominator = Array.isArray(denominator)
                        ? denominator.map(convertToInt)
                        : [1]

        dd = largestNonZeroIndex(denominator)

        if ( dd  === undefined ) {
            throw new Error('the denominator must not equal 0')
        }

        numerator = righttrim(numerator)
        denominator = righttrim(denominator)
        if ( dd > 0 ) {
            divisor = gcd(numerator, denominator)
            if ( Math.abs(degree(divisor[0])) > 0 || divisor[0][0] !== 1 ) {
                numerator = divide(numerator, divisor[0])[0]
                denominator = divide(denominator, divisor[0])[0]
            }
        }

        if ( numerator.length === 1 && Math.abs(numerator[0]) === 0 ) {
            denominator = [1]
        }

        divisor = numerator.concat(denominator).reduce(
            function(p,c){
                return p===0?c:(rats.gcd(p,c))
            }
        )

        divisor = denominator[denominator.length-1] * divisor < 0
                                            ? divisor * -1
                                            : divisor

        numerator = righttrim(numerator.map(function(v){ return v/divisor}))
        denominator = righttrim(denominator.map(function(v){ return v/divisor}))

        idx = '['+numerator.join(',')+']/['+denominator.join(',')+']'

        if ( pns[idx] === undefined ) {
            pns[idx] = new polyrat
            pns[idx][0] = numerator
            pns[idx][1] = denominator
        }


        return pns[idx]
    }

    piper.polyrat = polyrat

    piper.rndp = rndp

    if ( module != undefined && module.exports )
        module.exports = piper
    else
        root.factory = piper

}(this)
