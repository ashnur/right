"use strict"
void function(root){

    var ratjs

    ratjs = (function() {
        var bean = require('bean')
            , prsr = require('prsr')
            ;

        function ratjs() {}

        function tic(e) {
            var result = prsr(e.currentTarget.value + "\n")
            return document.getElementById('output').innerHTML = JSON.stringify(result)
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
