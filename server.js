"use strict"
var browserify = require('browserify')
    , ecstatic = require('ecstatic')(__dirname)
    , express = require('express')
    , server
    ;

server = express()

//server.get('/bundle.js', function(req, res) {
//    var source = browserify({
//        debug: true
//    }).addEntry(__dirname+'/right.js').bundle()
//
//    return res.send(source, {
//        'Content-Type': 'text/javascript'
//    })
//})

server.use(ecstatic)

server.listen(8001)

console.log('Listening on :8001')
