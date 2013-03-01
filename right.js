"use strict"
void function(root){

    var ratjs

    ratjs = (function() {
        var bean = require('bean')
            , prsr = require('prsr')
            ;

        function ratjs(){}

        function tic(e) {
            var result, lines = '', i, reslen
                , num
                , den
                , out = document.getElementById('output')
                ;
            try {
                result = prsr(e.currentTarget.value + "\n")
            } catch (e) {
                return out.innerHTML = e.message
            }

            reslen = result.length
            for ( i = 0; i < reslen ; i++ ) {
                console.log('o',result)
                lines += result[i].toPolynom()
                lines +='<br/>'
            }
            out.innerHTML = lines
            return
        }

        ratjs.watch = function(id) {
            return bean.one(window, 'load', function() {
                var elem;
                elem = document.getElementById(id)
                if ( elem != null ) return bean.add(elem, 'keyup', tic)
            })
        }

        return ratjs

    })()

    ratjs.watch('input')

}(this)
