"use strict"
void function(root){

    var ratjs

    ratjs = (function() {
        var bean = require('bean')
            , prsr = require('prsr')
            ;

        function ratjs() {}

        function tic(e) {
            var result, lines = '', i, reslen
                , num
                , den
                ;
            try {
                result = prsr(e.currentTarget.value + "\n")
            } catch (e) {
                return document.getElementById('output').innerHTML = e.message
            }

            reslen = result.length
            for ( i = 0; i < reslen ; i++ ) {
                num = result[i][0]
                den = result[i][1]
                lines += '' + num + ( den !== 1 ? '/'+den : '' )
                lines +='<br/>'
            }
            return document.getElementById('output').innerHTML = lines
        }

        ratjs.watch = function(id) {
            return bean.one(window, 'load', function() {
                var elem;
                elem = document.querySelectorAll('#' + id)[0]
                if ( elem != null ) return bean.add(elem, 'keyup', tic)
            })
        }

        return ratjs

    })()

    ratjs.watch('input')

}(this)
