;(function(e,t,n,r){function i(r){if(!n[r]){if(!t[r]){if(e)return e(r);throw new Error("Cannot find module '"+r+"'")}var s=n[r]={exports:{}};t[r][0](function(e){var n=t[r][1][e];return i(n?n:e)},s,s.exports)}return n[r].exports}for(var s=0;s<r.length;s++)i(r[s]);return i})(typeof require!=="undefined"&&require,{1:[function(require,module,exports){"use strict"
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
                lines += result[i].display()
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

},{"prsr":2,"bean":3}],2:[function(require,module,exports){// This file is just added for convenience so this repository can be
// directly checked out into a project's deps folder
module.exports = require('./lib/prsr')

},{"./lib/prsr":4}],3:[function(require,module,exports){/*!
  * bean.js - copyright Jacob Thornton 2011
  * https://github.com/fat/bean
  * MIT License
  * special thanks to:
  * dean edwards: http://dean.edwards.name/
  * dperini: https://github.com/dperini/nwevents
  * the entire mootools team: github.com/mootools/mootools-core
  */
!function (name, context, definition) {
  if (typeof module !== 'undefined') module.exports = definition(name, context);
  else if (typeof define === 'function' && typeof define.amd  === 'object') define(definition);
  else context[name] = definition(name, context);
}('bean', this, function (name, context) {
  var win = window
    , old = context[name]
    , overOut = /over|out/
    , namespaceRegex = /[^\.]*(?=\..*)\.|.*/
    , nameRegex = /\..*/
    , addEvent = 'addEventListener'
    , attachEvent = 'attachEvent'
    , removeEvent = 'removeEventListener'
    , detachEvent = 'detachEvent'
    , ownerDocument = 'ownerDocument'
    , targetS = 'target'
    , qSA = 'querySelectorAll'
    , doc = document || {}
    , root = doc.documentElement || {}
    , W3C_MODEL = root[addEvent]
    , eventSupport = W3C_MODEL ? addEvent : attachEvent
    , slice = Array.prototype.slice
    , mouseTypeRegex = /click|mouse(?!(.*wheel|scroll))|menu|drag|drop/i
    , mouseWheelTypeRegex = /mouse.*(wheel|scroll)/i
    , textTypeRegex = /^text/i
    , touchTypeRegex = /^touch|^gesture/i
    , ONE = {} // singleton for quick matching making add() do one()

    , nativeEvents = (function (hash, events, i) {
        for (i = 0; i < events.length; i++)
          hash[events[i]] = 1
        return hash
      }({}, (
          'click dblclick mouseup mousedown contextmenu ' +                  // mouse buttons
          'mousewheel mousemultiwheel DOMMouseScroll ' +                     // mouse wheel
          'mouseover mouseout mousemove selectstart selectend ' +            // mouse movement
          'keydown keypress keyup ' +                                        // keyboard
          'orientationchange ' +                                             // mobile
          'focus blur change reset select submit ' +                         // form elements
          'load unload beforeunload resize move DOMContentLoaded '+          // window
          'readystatechange message ' +                                      // window
          'error abort scroll ' +                                            // misc
          (W3C_MODEL ? // element.fireEvent('onXYZ'... is not forgiving if we try to fire an event
                       // that doesn't actually exist, so make sure we only do these on newer browsers
            'show ' +                                                          // mouse buttons
            'input invalid ' +                                                 // form elements
            'touchstart touchmove touchend touchcancel ' +                     // touch
            'gesturestart gesturechange gestureend ' +                         // gesture
            'readystatechange pageshow pagehide popstate ' +                   // window
            'hashchange offline online ' +                                     // window
            'afterprint beforeprint ' +                                        // printing
            'dragstart dragenter dragover dragleave drag drop dragend ' +      // dnd
            'loadstart progress suspend emptied stalled loadmetadata ' +       // media
            'loadeddata canplay canplaythrough playing waiting seeking ' +     // media
            'seeked ended durationchange timeupdate play pause ratechange ' +  // media
            'volumechange cuechange ' +                                        // media
            'checking noupdate downloading cached updateready obsolete ' +     // appcache
            '' : '')
        ).split(' ')
      ))

    , customEvents = (function () {
        var cdp = 'compareDocumentPosition'
          , isAncestor = cdp in root
              ? function (element, container) {
                  return container[cdp] && (container[cdp](element) & 16) === 16
                }
              : 'contains' in root
                ? function (element, container) {
                    container = container.nodeType === 9 || container === window ? root : container
                    return container !== element && container.contains(element)
                  }
                : function (element, container) {
                    while (element = element.parentNode) if (element === container) return 1
                    return 0
                  }

        function check(event) {
          var related = event.relatedTarget
          return !related
            ? related === null
            : (related !== this && related.prefix !== 'xul' && !/document/.test(this.toString()) && !isAncestor(related, this))
        }

        return {
            mouseenter: { base: 'mouseover', condition: check }
          , mouseleave: { base: 'mouseout', condition: check }
          , mousewheel: { base: /Firefox/.test(navigator.userAgent) ? 'DOMMouseScroll' : 'mousewheel' }
        }
      }())

    , fixEvent = (function () {
        var commonProps = 'altKey attrChange attrName bubbles cancelable ctrlKey currentTarget detail eventPhase getModifierState isTrusted metaKey relatedNode relatedTarget shiftKey srcElement target timeStamp type view which'.split(' ')
          , mouseProps = commonProps.concat('button buttons clientX clientY dataTransfer fromElement offsetX offsetY pageX pageY screenX screenY toElement'.split(' '))
          , mouseWheelProps = mouseProps.concat('wheelDelta wheelDeltaX wheelDeltaY wheelDeltaZ axis'.split(' ')) // 'axis' is FF specific
          , keyProps = commonProps.concat('char charCode key keyCode keyIdentifier keyLocation'.split(' '))
          , textProps = commonProps.concat(['data'])
          , touchProps = commonProps.concat('touches targetTouches changedTouches scale rotation'.split(' '))
          , messageProps = commonProps.concat(['data', 'origin', 'source'])
          , preventDefault = 'preventDefault'
          , createPreventDefault = function (event) {
              return function () {
                if (event[preventDefault])
                  event[preventDefault]()
                else
                  event.returnValue = false
              }
            }
          , stopPropagation = 'stopPropagation'
          , createStopPropagation = function (event) {
              return function () {
                if (event[stopPropagation])
                  event[stopPropagation]()
                else
                  event.cancelBubble = true
              }
            }
          , createStop = function (synEvent) {
              return function () {
                synEvent[preventDefault]()
                synEvent[stopPropagation]()
                synEvent.stopped = true
              }
            }
          , copyProps = function (event, result, props) {
              var i, p
              for (i = props.length; i--;) {
                p = props[i]
                if (!(p in result) && p in event) result[p] = event[p]
              }
            }

        return function (event, isNative) {
          var result = { originalEvent: event, isNative: isNative }
          if (!event)
            return result

          var props
            , type = event.type
            , target = event[targetS] || event.srcElement

          result[preventDefault] = createPreventDefault(event)
          result[stopPropagation] = createStopPropagation(event)
          result.stop = createStop(result)
          result[targetS] = target && target.nodeType === 3 ? target.parentNode : target

          if (isNative) { // we only need basic augmentation on custom events, the rest is too expensive
            if (type.indexOf('key') !== -1) {
              props = keyProps
              result.keyCode = event.keyCode || event.which
            } else if (mouseTypeRegex.test(type)) {
              props = mouseProps
              result.rightClick = event.which === 3 || event.button === 2
              result.pos = { x: 0, y: 0 }
              if (event.pageX || event.pageY) {
                result.clientX = event.pageX
                result.clientY = event.pageY
              } else if (event.clientX || event.clientY) {
                result.clientX = event.clientX + doc.body.scrollLeft + root.scrollLeft
                result.clientY = event.clientY + doc.body.scrollTop + root.scrollTop
              }
              if (overOut.test(type))
                result.relatedTarget = event.relatedTarget || event[(type === 'mouseover' ? 'from' : 'to') + 'Element']
            } else if (touchTypeRegex.test(type)) {
              props = touchProps
            } else if (mouseWheelTypeRegex.test(type)) {
              props = mouseWheelProps
            } else if (textTypeRegex.test(type)) {
              props = textProps
            } else if (type === 'message') {
              props = messageProps
            }
            copyProps(event, result, props || commonProps)
          }
          return result
        }
      }())

      // if we're in old IE we can't do onpropertychange on doc or win so we use doc.documentElement for both
    , targetElement = function (element, isNative) {
        return !W3C_MODEL && !isNative && (element === doc || element === win) ? root : element
      }

      // we use one of these per listener, of any type
    , RegEntry = (function () {
        function entry(element, type, handler, original, namespaces) {
          var isNative = this.isNative = nativeEvents[type] && element[eventSupport]
          this.element = element
          this.type = type
          this.handler = handler
          this.original = original
          this.namespaces = namespaces
          this.custom = customEvents[type]
          this.eventType = W3C_MODEL || isNative ? type : 'propertychange'
          this.customType = !W3C_MODEL && !isNative && type
          this[targetS] = targetElement(element, isNative)
          this[eventSupport] = this[targetS][eventSupport]
        }

        entry.prototype = {
            // given a list of namespaces, is our entry in any of them?
            inNamespaces: function (checkNamespaces) {
              var i, j
              if (!checkNamespaces)
                return true
              if (!this.namespaces)
                return false
              for (i = checkNamespaces.length; i--;) {
                for (j = this.namespaces.length; j--;) {
                  if (checkNamespaces[i] === this.namespaces[j])
                    return true
                }
              }
              return false
            }

            // match by element, original fn (opt), handler fn (opt)
          , matches: function (checkElement, checkOriginal, checkHandler) {
              return this.element === checkElement &&
                (!checkOriginal || this.original === checkOriginal) &&
                (!checkHandler || this.handler === checkHandler)
            }
        }

        return entry
      }())

    , registry = (function () {
        // our map stores arrays by event type, just because it's better than storing
        // everything in a single array. uses '$' as a prefix for the keys for safety
        var map = {}

          // generic functional search of our registry for matching listeners,
          // `fn` returns false to break out of the loop
          , forAll = function (element, type, original, handler, fn) {
              if (!type || type === '*') {
                // search the whole registry
                for (var t in map) {
                  if (t.charAt(0) === '$')
                    forAll(element, t.substr(1), original, handler, fn)
                }
              } else {
                var i = 0, l, list = map['$' + type], all = element === '*'
                if (!list)
                  return
                for (l = list.length; i < l; i++) {
                  if (all || list[i].matches(element, original, handler))
                    if (!fn(list[i], list, i, type))
                      return
                }
              }
            }

          , has = function (element, type, original) {
              // we're not using forAll here simply because it's a bit slower and this
              // needs to be fast
              var i, list = map['$' + type]
              if (list) {
                for (i = list.length; i--;) {
                  if (list[i].matches(element, original, null))
                    return true
                }
              }
              return false
            }

          , get = function (element, type, original) {
              var entries = []
              forAll(element, type, original, null, function (entry) { return entries.push(entry) })
              return entries
            }

          , put = function (entry) {
              (map['$' + entry.type] || (map['$' + entry.type] = [])).push(entry)
              return entry
            }

          , del = function (entry) {
              forAll(entry.element, entry.type, null, entry.handler, function (entry, list, i) {
                list.splice(i, 1)
                if (list.length === 0)
                  delete map['$' + entry.type]
                return false
              })
            }

            // dump all entries, used for onunload
          , entries = function () {
              var t, entries = []
              for (t in map) {
                if (t.charAt(0) === '$')
                  entries = entries.concat(map[t])
              }
              return entries
            }

        return { has: has, get: get, put: put, del: del, entries: entries }
      }())

    , selectorEngine = doc[qSA]
        ? function (s, r) {
            return r[qSA](s)
          }
        : function () {
            throw new Error('Bean: No selector engine installed') // eeek
          }

    , setSelectorEngine = function (e) {
        selectorEngine = e
      }

      // add and remove listeners to DOM elements
    , listener = W3C_MODEL ? function (element, type, fn, add) {
        element[add ? addEvent : removeEvent](type, fn, false)
      } : function (element, type, fn, add, custom) {
        if (custom && add && element['_on' + custom] === null)
          element['_on' + custom] = 0
        element[add ? attachEvent : detachEvent]('on' + type, fn)
      }

    , nativeHandler = function (element, fn, args) {
        var beanDel = fn.__beanDel
          , handler = function (event) {
          event = fixEvent(event || ((this[ownerDocument] || this.document || this).parentWindow || win).event, true)
          if (beanDel) // delegated event, fix the fix
            event.currentTarget = beanDel.ft(event[targetS], element)
          return fn.apply(element, [event].concat(args))
        }
        handler.__beanDel = beanDel
        return handler
      }

    , customHandler = function (element, fn, type, condition, args, isNative) {
        var beanDel = fn.__beanDel
          , handler = function (event) {
          var target = beanDel ? beanDel.ft(event[targetS], element) : this // deleated event
          if (condition ? condition.apply(target, arguments) : W3C_MODEL ? true : event && event.propertyName === '_on' + type || !event) {
            if (event) {
              event = fixEvent(event || ((this[ownerDocument] || this.document || this).parentWindow || win).event, isNative)
              event.currentTarget = target
            }
            fn.apply(element, event && (!args || args.length === 0) ? arguments : slice.call(arguments, event ? 0 : 1).concat(args))
          }
        }
        handler.__beanDel = beanDel
        return handler
      }

    , once = function (rm, element, type, fn, originalFn) {
        // wrap the handler in a handler that does a remove as well
        return function () {
          rm(element, type, originalFn)
          fn.apply(this, arguments)
        }
      }

    , removeListener = function (element, orgType, handler, namespaces) {
        var i, l, entry
          , type = (orgType && orgType.replace(nameRegex, ''))
          , handlers = registry.get(element, type, handler)

        for (i = 0, l = handlers.length; i < l; i++) {
          if (handlers[i].inNamespaces(namespaces)) {
            if ((entry = handlers[i])[eventSupport])
              listener(entry[targetS], entry.eventType, entry.handler, false, entry.type)
            // TODO: this is problematic, we have a registry.get() and registry.del() that
            // both do registry searches so we waste cycles doing this. Needs to be rolled into
            // a single registry.forAll(fn) that removes while finding, but the catch is that
            // we'll be splicing the arrays that we're iterating over. Needs extra tests to
            // make sure we don't screw it up. @rvagg
            registry.del(entry)
          }
        }
      }

    , addListener = function (element, orgType, fn, originalFn, args) {
        var entry
          , type = orgType.replace(nameRegex, '')
          , namespaces = orgType.replace(namespaceRegex, '').split('.')

        if (registry.has(element, type, fn))
          return element // no dupe
        if (type === 'unload')
          fn = once(removeListener, element, type, fn, originalFn) // self clean-up
        if (customEvents[type]) {
          if (customEvents[type].condition)
            fn = customHandler(element, fn, type, customEvents[type].condition, args, true)
          type = customEvents[type].base || type
        }
        entry = registry.put(new RegEntry(element, type, fn, originalFn, namespaces[0] && namespaces))
        entry.handler = entry.isNative ?
          nativeHandler(element, entry.handler, args) :
          customHandler(element, entry.handler, type, false, args, false)
        if (entry[eventSupport])
          listener(entry[targetS], entry.eventType, entry.handler, true, entry.customType)
      }

    , del = function (selector, fn, $) {
            //TODO: findTarget (therefore $) is called twice, once for match and once for
            // setting e.currentTarget, fix this so it's only needed once
        var findTarget = function (target, root) {
              var i, array = typeof selector === 'string' ? $(selector, root) : selector
              for (; target && target !== root; target = target.parentNode) {
                for (i = array.length; i--;) {
                  if (array[i] === target)
                    return target
                }
              }
            }
          , handler = function (e) {
              var match = findTarget(e[targetS], this)
              match && fn.apply(match, arguments)
            }

        handler.__beanDel = {
            ft: findTarget // attach it here for customEvents to use too
          , selector: selector
          , $: $
        }
        return handler
      }

    , remove = function (element, typeSpec, fn) {
        var k, type, namespaces, i
          , rm = removeListener
          , isString = typeSpec && typeof typeSpec === 'string'

        if (isString && typeSpec.indexOf(' ') > 0) {
          // remove(el, 't1 t2 t3', fn) or remove(el, 't1 t2 t3')
          typeSpec = typeSpec.split(' ')
          for (i = typeSpec.length; i--;)
            remove(element, typeSpec[i], fn)
          return element
        }
        type = isString && typeSpec.replace(nameRegex, '')
        if (type && customEvents[type])
          type = customEvents[type].type
        if (!typeSpec || isString) {
          // remove(el) or remove(el, t1.ns) or remove(el, .ns) or remove(el, .ns1.ns2.ns3)
          if (namespaces = isString && typeSpec.replace(namespaceRegex, ''))
            namespaces = namespaces.split('.')
          rm(element, type, fn, namespaces)
        } else if (typeof typeSpec === 'function') {
          // remove(el, fn)
          rm(element, null, typeSpec)
        } else {
          // remove(el, { t1: fn1, t2, fn2 })
          for (k in typeSpec) {
            if (typeSpec.hasOwnProperty(k))
              remove(element, k, typeSpec[k])
          }
        }
        return element
      }

      // 5th argument, $=selector engine, is deprecated and will be removed
    , add = function (element, events, fn, delfn, $) {
        var type, types, i, args
          , originalFn = fn
          , isDel = fn && typeof fn === 'string'

        if (events && !fn && typeof events === 'object') {
          for (type in events) {
            if (events.hasOwnProperty(type))
              add.apply(this, [ element, type, events[type] ])
          }
        } else {
          args = arguments.length > 3 ? slice.call(arguments, 3) : []
          types = (isDel ? fn : events).split(' ')
          isDel && (fn = del(events, (originalFn = delfn), $ || selectorEngine)) && (args = slice.call(args, 1))
          // special case for one()
          this === ONE && (fn = once(remove, element, events, fn, originalFn))
          for (i = types.length; i--;) addListener(element, types[i], fn, originalFn, args)
        }
        return element
      }

    , one = function () {
        return add.apply(ONE, arguments)
      }

    , fireListener = W3C_MODEL ? function (isNative, type, element) {
        var evt = doc.createEvent(isNative ? 'HTMLEvents' : 'UIEvents')
        evt[isNative ? 'initEvent' : 'initUIEvent'](type, true, true, win, 1)
        element.dispatchEvent(evt)
      } : function (isNative, type, element) {
        element = targetElement(element, isNative)
        // if not-native then we're using onpropertychange so we just increment a custom property
        isNative ? element.fireEvent('on' + type, doc.createEventObject()) : element['_on' + type]++
      }

    , fire = function (element, type, args) {
        var i, j, l, names, handlers
          , types = type.split(' ')

        for (i = types.length; i--;) {
          type = types[i].replace(nameRegex, '')
          if (names = types[i].replace(namespaceRegex, ''))
            names = names.split('.')
          if (!names && !args && element[eventSupport]) {
            fireListener(nativeEvents[type], type, element)
          } else {
            // non-native event, either because of a namespace, arguments or a non DOM element
            // iterate over all listeners and manually 'fire'
            handlers = registry.get(element, type)
            args = [false].concat(args)
            for (j = 0, l = handlers.length; j < l; j++) {
              if (handlers[j].inNamespaces(names))
                handlers[j].handler.apply(element, args)
            }
          }
        }
        return element
      }

    , clone = function (element, from, type) {
        var i = 0
          , handlers = registry.get(from, type)
          , l = handlers.length
          , args, beanDel

        for (;i < l; i++) {
          if (handlers[i].original) {
            beanDel = handlers[i].handler.__beanDel
            if (beanDel) {
              args = [ element, beanDel.selector, handlers[i].type, handlers[i].original, beanDel.$]
            } else
              args = [ element, handlers[i].type, handlers[i].original ]
            add.apply(null, args)
          }
        }
        return element
      }

    , bean = {
          add: add
        , one: one
        , remove: remove
        , clone: clone
        , fire: fire
        , setSelectorEngine: setSelectorEngine
        , noConflict: function () {
            context[name] = old
            return this
          }
      }

  if (win[attachEvent]) {
    // for IE, clean up on unload to avoid leaks
    var cleanup = function () {
      var i, entries = registry.entries()
      for (i in entries) {
        if (entries[i].type && entries[i].type !== 'unload')
          remove(entries[i].element, entries[i].type)
      }
      win[detachEvent]('onunload', cleanup)
      win.CollectGarbage && win.CollectGarbage()
    }
    win[attachEvent]('onunload', cleanup)
  }

  return bean
})

},{}],5:[function(require,module,exports){// This file is just added for convenience so this repository can be
// directly checked out into a project's deps folder
module.exports = require('./lib/rats');

},{"./lib/rats":6}],6:[function(require,module,exports){void function(root){
    "use strict"

    var numbers = {};

    function isInt(input){
        return typeof input !== 'object' && parseInt(input, 10) == input
    }


    function checkInput(input){
        if ( input instanceof Int32Array && input.byteLength === 8 ) {
            return input
        }
        return rat(input)
    }

    function gcd(a, b){
        var t;
        a = Math.abs(a)
        b = Math.abs(b)
        while (b > 0) {
            t = b
            b = a % b
            a = t
        }
        return a
    }

    function hashify(){
        return this[0]+'/'+this[1]
    }

    function display(){
        return ''+this[0]+(this[1]!=1?'/'+this[1]:'')
    }

    function val(){
        return this[0]/this[1]
    }

    function plus(x){
        x = checkInput(x)
        return rat(this[0]*x[1]+x[0]*this[1], this[1]*x[1])
    }

    function minus(x){
        x = checkInput(x)
        return rat(this[0]*x[1]-x[0]*this[1], this[1]*x[1])
    }

    function times(x){
        x = checkInput(x)
        return rat(this[0]*x[0], this[1]*x[1])
    }

    function per(x){
        x = checkInput(x)
        return rat(this[0]*x[1], x[0]*this[1])
    }

    function rat(numerator, denominator){

        var index, divisor;

        if ( ! isInt(numerator) ) {
            throw new Error('invalid argument '+numerator+' ('+(typeof numerator)+')')
        } else if ( typeof numerator === 'string' ) {
            numerator = parseInt(numerator, 10)
        }

        if ( ! isInt(denominator) ) {
            denominator = 1
        } else if ( typeof denominator === 'string' ) {
            denominator = parseInt(denominator, 10)
        }

        if ( denominator == 0 ) {
            throw new Error('the denominator must not equal 0')
        }

        divisor = gcd(numerator, denominator)
        if ( Math.abs(divisor) > 1 ) {
            numerator = numerator / divisor
            denominator = denominator / divisor
        }

        if ( denominator < 0 ) {
            numerator *= -1
            denominator *= -1
        }

        index = hashify.call([numerator, denominator])

        if ( numbers[index] === undefined ) {
            numbers[index] = new Int32Array(2)
            numbers[index][0] = numerator
            numbers[index][1] = denominator
            numbers[index].toString = hashify
            numbers[index].display = display
            numbers[index].val = val
            numbers[index].plus = plus
            numbers[index].minus = minus
            numbers[index].times = times
            numbers[index].per = per
        }

        return numbers[index]

    }

    rat.isInt = isInt
    rat.checkInput = checkInput
    rat.gcd = gcd

    if ( typeof module !== 'undefined' && module.exports ) {
        module.exports = rat
    } else {
        root.factory = rat
    }

}(this)

},{}],7:[function(require,module,exports){// This file is just added for convenience so this repository can be
// directly checked out into a project's deps folder
module.exports = require('./lib/piper');

},{"./lib/piper":8}],8:[function(require,module,exports){void function(root){
    "use strict"

    var num
        , pns = {}
        , rats = require('rats')
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

    function ltrim(arr){
        while ( arr.length > 1 && arr[0] === 0  ) {
            arr.shift()
        }
        return arr
    }

    function rtrim(arr){
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
        var a=[], i = 0;
        pow = pow == null ? 1 : pow
        for (; i < pow; i++ ) { a.push(0) }
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
            , cf = rand(13, -13)
            ;

        return piper(base.map(function(){
            var c = rand(13, -13)
                ;
            return pure ? c : c * cf
        }))
    }

    function degree(arr){
        if ( arr == null && this == null ) {
            throw new Error('missing argument')
        }

        var arr = (arr == null) ? this : arr
            , t1, t2
            ;

        if ( arr instanceof polyrat ) {
            t1 = largestNonZeroIndex(arr[0])
            t2 = largestNonZeroIndex(arr[1])
            return t1 > t2 ? t1 : t2
        } else if ( Array.isArray(arr) ) {
            return largestNonZeroIndex(arr)
        } else {
            throw new Error('dafuq')
        }
    }


    function divide(p, q){
        //console.log(p,q)
        var n, u, v, k, j, s=[], r=[]
            , pdeg = degree(p), qdeg = degree(q)
            ;

        u = p.slice(0)
        v = q.slice(0)

        for ( k = pdeg - qdeg ; k >= 0 ; k-- ) {
            s[k] = Math.floor(u[qdeg+k]/v[qdeg])
            for ( j = qdeg + k  ; j >= k ; j-- ) {
                u[j] = u[j]-(s[k]*v[j-k])
            }
        }

        s = rtrim(s)
        u = rtrim(u)

        return [s,u]
    }


    function gcd(a, b){
        var r = []
            , i = 1
            , guard = 0
            , dc , dl
            , lc , ll
            , divisor
            ;
        if ( degree(a) >= degree(b) ) {
            r[0] = a
            r[1] = b
        } else {
            r[0] = b
            r[1] = a
        }
        while ( r[i] != 0 ) {
            if ( guard ++ > 50 ) throw new Error('z')
            //console.log(r, r.length)
            dl = degree(r[i-1])
            dc = degree(r[i])
            if ( dl < dc ) {
                r[i+1] = dl
            } else {
                r[i] = piper(r[i]).times(piper(alpha(dl-dc)))[0]
                lc = r[i][r[i].length-1]
                ll = r[i-1][r[i-1].length-1]
                r[i-1] = r[i-1].map(function(c){return c*lc})
                r[i] = r[i].map(function(c){return c*ll})
                divisor = r[i].concat(r[i-1]).reduce(
                    function(p,c){
                        return p===0?c:(rats.gcd(p,c))
                    }
                )
                r[i-1] = r[i-1].map(function(c){return c/divisor})
                r[i] = r[i].map(function(c){return c/divisor})
                r[i+1] = rtrim(r[i-1].map(function(c,j){return c - r[i][j]}))
                //console.log('r',r)
            }
            i++
            if ( r.length > 3 && piper(r[i]) == piper(r[i-2]) && piper(r[i-1]) == piper(r[i-3]) ) {
                return piper([1])
            }
        }
        return piper(ltrim(r[i-1]))
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
                return c ? (c < 0 ? c : ( i == v.length-1 ? '' : '+')+c ) +
                            (i == 0 ? '':  i == 1 ? '*'+α : '*'+α+'^'+i) : ''
            }).reverse().join('')
        }
        return '('+nom(this[0])+')/('+nom(this[1])+')'
    }

    function plus(input, input2){
        var len, i, l, r, result=[];

        len = input.length > input2.length ? input.length : input2.length

        for ( i = 0; i < len; i++ ) {
            l = input[i] !== undefined ? input[i] : 0
            r = input2[i] !== undefined ? input2[i] : 0
            result[i] = l+r
        }
        return result
    }

    function minus(input, input2){
        var len, i, l, r, result=[];
        len = input.length > input2.length ? input.length : input2.length
        for ( i = 0; i < len; i++ ) {
            l = input[i] !== undefined ? input[i] : 0
            r = input2[i] !== undefined ? input2[i] : 0
            result[i] = l-r
        }
        return result
    }

    function times(input, input2){
        var p, plen, q, qlen, i, j, result=[];
        p = input.slice(0)
        plen = input.length
        q = input2.slice(0)
        qlen = input2.length
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

    function per(input, input2){
        var result
            , f = input instanceof polyrat
            , s = input2 instanceof polyrat
            , t = null
            ;
        if ( f && s ) {
            throw new Error ('wtf')
            result = divide(input, input2)
        //} else if ( f && !s) {
        //    result = input.per(piper(input2))
        //} else if ( !f && s) {
        //    result = piper(input).per(input2)
        } else {
            result = piper(input, input2)
        }
        return result
    }

    function pow(input, input2){
        var i, result=[];
        if ( ! isInt( input2 ) ) {
            throw new Error('undefined operation, look for roots elsewhere')
        }
        i=0
        result = input
        if ( input2 !== 0 ) {
            while ( ++i < input2 ) {
                result = result.times(input)
            }
        } else {
            result = piper([1])
        }
        return result
    }

    function val(input, input2){
        var n = piper([0])
            , d = piper([0])
            , len
            , i
            , t1
            , t2
            ;
        if ( ! ( input2 instanceof polyrat ) ) {
            if ( Array.isArray(input2) ) {
                input2 = piper(input2)
            } else {
                input2 = piper([input2])
            }
        }
        len = input[0].length
        for ( i=0; i < len; i++ ) {
            t1 = piper([input[0][i]])
            t2 = piper(input2.pow(i))
            n = n.plus(t1.times(t2))
        }
        len = input[1].length
        for ( i=0; i < len; i++ ) {
            t1 = piper([input[1][i]])
            t2 = piper(input2.pow(i))
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

        numerator = rtrim(numerator)
        denominator = rtrim(denominator)
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

        numerator = rtrim(numerator.map(function(v){ return v/divisor}))
        denominator = rtrim(denominator.map(function(v){ return v/divisor}))

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

},{"rats":5}],4:[function(require,module,exports){void function(root){
    "use strict"

    var piper = require('piper')
        , ONE, ZERO
        , defaults = {}
        , space = require('spce')
        , symbols = {}
        , tokens = []
        , rat = require('rats')
        ;

//    piper.polyrat.prototype.toString = function(){
//        var pretty = function(c){return c[0]+(c[1]?'':'/'+c[1])}
//            , r
//            ;
//        if ( this[1].length = 1 && this[1][0] == piper([1]) ) {
//            r = '(['+this[0].map(pretty).join(',')+'])'
//        } else {
//            r = '(['+this[0].map(pretty).join(',')+']/['+this[1].map(pretty).join(',')+'])'
//        }
//        return r
//    }

    function tokenize(input){
        return tokenizer.call(input)
    }

    function tokenizer(){

        if ( typeof this === "undefined" ||  this === null ) {
            return
        }

        var c, from, i=0
            , length, n
            , result = []
            , str = '', _ref
            ;

        length = this.length

        function make(type, value){
            return {
                type: type,
                value: value,
                from: from,
                to: i,
                toString: function(){
                    return value.toString()
                }
            }
        }

        c = this.charAt(i)

        while ( c ) {
            from = i
            if ( c === ' ' ) {
                i += 1
                c = this.charAt(i)
            } else if ( /[a-zA-Z]/.test(c) ) {
                str = c
                i += 1
                while ( true ) {
                    c = this.charAt(i)
                    if ( /[0-9a-zA-Z]/.test(c) ) {
                        str += c
                        i += 1
                    } else {
                        break
                    }
                }
                result.push(make('var', str))
            } else if ( /[0-9]/.test(c) ) {
                str = c
                i += 1
                while ( true ) {
                    c = this.charAt(i)
                    if ( !/[0-9]/.test(c) ) {
                        break
                    }
                    i += 1
                    str += c
                }
                if ( /[a-zA-Z]/.test(c) ) {
                    str += c
                    i += 1
                    throw 'Bad number'
                }
                n = parseInt(str, 10)
                if ( isFinite(n) ) {
                    result.push(make('number', n))
                } else {
                    throw 'Bad number'
                }
            } else {
                i += 1
                result.push(make('operator', c))
                c = this.charAt(i)
            }
        }
        return result
    }

    function sybl(token, lvl, slv){
        var x
            ;
        if ( lvl == null ) {
            lvl = 1
        }
        this.lvl = lvl
        this.toString = token.toString
        x = extend(token, this)
        switch ( x.type ) {
            case  'var'  :
                x = piper([0,1])
                x.lvl = 1
                break
            case 'operator' :
                x.slv = (slv != null)
                                ? slv
                                : (function() {
                                    throw new Error('undefined operator')
                                })
                break
            case  'number' :
                x = piper([token.toString()])
                x.lvl = 1
                break
        }
        return x
    }

    function variable(name){
        return space.push(name)
    }

    function symbolizer(token, lvl, slv){
        return this[token.toString()] == null
                        ? this[token.toString()] = new sybl(token, lvl, slv)
                        : this[token.toString()]
    }

    function ct(str){
        var t
            ;
        t = tokenize(str)
        if ( str.length < 2 ) {
            return t[0]
        } else {
            return t
        }
    }

    function literal(tok){
        var ctok, r
            ;
        if ( typeof tok === 'string' ) {
            ctok = ct(tok)
        } else {
            ctok = tok
        }
        r = symbolizer.call(symbols, ctok, 1, (function(right){
            return right
        }))
        return r
    }

    ZERO = literal("0")

    ONE = literal("1")

    symbolizer.call(defaults, ct("\n"), -1, (function(l, r){
        if ( l == null ) {
            l = ZERO
        }
        return literal(l)
    }))

    symbolizer.call(defaults, ct("+"), 2, (function(l, r){
        if ( l == null ) {
            l = ZERO
        }
        if ( r == null ) {
            r = ZERO
        }
        return literal(l.plus(r))
    }))

    symbolizer.call(defaults, ct("-"), 2, (function(l, r){
        var x
            ;
        if ( l == null ) {
            l = ZERO
        }
        if ( r == null ) {
            r = ZERO
        }
        x = literal(l.minus(r))
        return x
    }))

    symbolizer.call(defaults, ct("*"), 3, (function(l, r){
        if ( l == null ) {
            l = ONE
        }
        if ( r == null ) {
            r = ONE
        }
        return literal(l.times(r))
    }))

    symbolizer.call(defaults, ct("/"), 3, (function(l, r){
        if ( l == null ) {
            l = ONE
        }
        if ( r == null ) {
            r = ONE
        }
        return literal(l.per(r))
    }))

    symbolizer.call(defaults, ct("^"), 4, (function(l, r){
        if ( l == null ) {
            l = ONE
        }
        if ( r == null ) {
            r = ZERO
        }
        //this is freakingly ugly
        return literal(piper(l.pow(r[0][0])))
    }))

    symbolizer.call(defaults, ct(")"), 0, (function(l){
        return literal(l)
    }))

    symbolizer.call(defaults, ct("("), 10, (function(l,r){
        var e = expr(0)
            ;
        tokens.shift()
        return e
    }))

    symbolizer.call(defaults, ct("="), 11, (function(l,r){
        if ( l == null || r == null ) throw new Error ('equations have two sides' )
        return null
    }))

    function symbolize(tokens){
        var token, i, len
            ;
        symbols = extend({}, defaults)
        for ( i = 0, len = tokens.length; i < len; i++ ) {
            token = tokens[i]
            symbolizer.call(symbols, token)
        }
        return symbols
    }

    function extend(obj){
        Array.prototype.forEach.call(Array.prototype.slice.call(arguments, 1), function(source){
            var prop
                ;
            for ( prop in source ) {
                obj[prop] = source[prop]
            }
        })
        return obj
    }
    function w(i){
        var key =  (tokens[i] != null) ? tokens[i].toString() : void 0
            ;
        return symbols[key]
    }

    function c(i){
        var key = tokens.splice(i, 1, null)[0]
            ;
        return symbols[key]
    }

    function x(i){
        var key = tokens.splice(i, 1)[0]
            ;
        if ( key instanceof Int32Array ) {
            return key
        }
        return symbols[key]
    }

    function g(i, o){
        return tokens.splice(i, 1, o)
    }

    function t(i){
        var _ref
            ;
        return (_ref = w(i)) != null ? _ref.type : void 0
    }

    function v(i){
        var ref = w(i), ref1 = ref != null ? ref.lvl : void 0
            ;
        return ref1 != null ? ref1 : Number.MIN_VALUE
    }

    function isop(i){
        return t(i) === 'operator'
    }

    function unry(i){
        var operator, rhs, lhs = null, ret, paren = false
            ;
        operator = c(i)
        if ( operator.lvl === 10 ) {
            if ( i === 1 ) lhs = tokens.shift()
            tokens.shift()
            rhs = null
            paren = true
        } else if ( v(i+1) === 10 ) {
            if ( i === 1 ) lhs = tokens.shift()
            tokens.shift()
            rhs = expr(0)
            tokens.shift()
            paren = true
        } else if ( ! isop(i + 1) ) {
            rhs = x(i + 1)
        } else {
            rhs = null
        }
        if ( paren ) {
            ret = tokens.splice(0, 0, operator.slv(null, rhs))
            if ( lhs !== null ) tokens.splice(0, 0, lhs)
        } else {
            ret = g(i, operator.slv(null, rhs))
        }
        return ret
    }

    function expr(lvl){
        var l = isop(0) ? null : x(0), nextop, operator, r
            ;

        while ( isop(0) && v(0) > lvl ) {
            while ( isop(1) && v(0) !== 10 && v(1) !== 10 ) {
                unry(1)
                if ( l == null ) {
                    unry(0)
                    l = x(0)
                }
            }
            if ( isop(0) ) {
                operator = x(0)
                if ( operator.lvl !== 10 ) {
                    r = !isop(0) ? w(0) : null
                    nextop = r != null ? 1 : 0
                }
                if ( v(nextop) <= operator.lvl ) {
                    if (r != null) {
                        x(0)
                    }
                } else {
                    r = expr(operator.lvl)
                }
                l = operator.slv(l, r)
            }
        }
        return l
    }

    function parse(input){
        var counter, e
            ;
        tokens = tokenize(input)
        symbols = symbolize(tokens)
        space.del('input')
        counter = 0
        while ( tokens.length > 0 ) {
            e = expr(-1)
            space.push('input', e)
            if ( typeof tokens[0] !== 'undefined'
                && typeof symbols[tokens[0].value] !== 'undefined'
                && symbols[tokens[0].value].lvl === -1 ) {
                    tokens.shift()
            }
            if (++counter > 100) {
                throw new Error('possible infinite loop')
            }
        }
        return space.get('input')
    }
    if ( typeof module != 'undefined' && module.exports ) {
        module.exports = parse
    } else {
        root.factory = parse
    }

}(this)

},{"rats":5,"piper":7,"spce":9}],9:[function(require,module,exports){// This file is just added for convenience so this repository can be
// directly checked out into a project's deps folder
module.exports = require('./lib/spce');

},{"./lib/spce":10}],10:[function(require,module,exports){void function(root){

    var spce,  expr, newkey, privkeys, variable, variables
        ;

    spce = {
        init: function () {
            return this
        }
        , add : function(value) {
            return variable(newkey(), value)
        }

        , get : function(key) {
            return variables[key]
        }

        , del : function(key) {
            return variables[key] = void 0
        }

        , push : function(key, value) {
            var arr
                ;
            arr = variables[key]
            if (!(arr != null)) {
                arr = []
            }
            arr.push(value)
            return variables[key] = arr
        }

        , variable : variable

        , variables : variables

    }

    privkeys = []

    //expr = luma.factory({
    //    init: function() {

    //        function expr(value) {
    //            this.body = function() {
    //                return value
    //            }
    //        }

    //        expr.prototype.eq = []

    //        expr.prototype.gt = []

    //        expr.prototype.lt = []

    //        expr.prototype.body = []

    //        expr.prototype.func = function() {
    //            var vars
    //            vars = 1 <= arguments.length ? Array.prototype.slice.call(arguments, 0) : []
    //        }


    //        return expr
    //    }

    //})

    newkey = function() {
        var s
            ;
        s = 'var' + privkeys.length
        privkeys.push(s)
        return s
    }

    variables = {}

    variable = function(key, value) {
        if (typeof key === 'undefined' || typeof value === 'undefined') {
            return null
        }
        if (!(variables[key] != null)) {
            variables[key] = value
        }
        return variables[key]
    }

    if ( typeof module != 'undefined' && module.exports ) {
        module.exports = spce
    } else {
        root.factory = spce
    }
}(this)

},{}]},{},[1]);