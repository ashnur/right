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

            //reslen = result.length
            //for ( i = 0; i < reslen ; i++ ) {
            //    lines += result[i].toPolynom() + ' ::: ' + result[i].display()
            //    lines +='<br/>'
            //}
            out.innerHTML = result
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

},{"bean":2,"prsr":3}],2:[function(require,module,exports){/*!
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

},{}],3:[function(require,module,exports){// This file is just added for convenience so this repository can be
// directly checked out into a project's deps folder
module.exports = require('./lib/prsr')

},{"./lib/prsr":4}],5:[function(require,module,exports){void function(root){
    "use strict"

    function make(type, value, from, to) {

        // Make a token object.

        return {
            type: type
            , value: value
            , from: from
            , to: to
        }
    }

    function tokenizer(source){
        var i = 0
            , length = source.length
            , token
            , tokens = []
            ;

        while ( i < length ) {

            tokenizer.types.forEach(function(type){
                while ( token = type.check(source, i) ) {
                    if ( ! token.ignore ) {
                        tokens.push(make(type.name, token.value, i, token.to))
                    }
                    i = token.to
                }
            })

        }

        return tokens
    }

    tokenizer.types = []
    tokenizer.add_type = function(name, check){
        tokenizer.types.push({name: name, check: check})
    }

    if ( module !== undefined && module.exports ) {
        module.exports = tokenizer
    } else {
        root.factory = tokenizer
    }

}(this)

},{}],4:[function(require,module,exports){void function(root){
    "use strict"

    var tokenizer = require('./tokenizer.js')
        , symbol_table = {}
        , variables = {}
        , token
        , tokens
        , token_nr
        , polyrat = require('polyrats')
        , ZERO =  polyrat([0])
        , ONE =  polyrat([1])
        , NEGONE =  polyrat([-1])
        ;

    tokenizer.add_type('variable', function(source, i){
        var c = source.charAt(i)
            , lead = /[a-zA-Z]/
            , follow = /[a-zA-Z0-9_]/
            , str = ''
            ;

        function forward(){
            str += c
            i ++
        }

        if ( lead.test(c) ) {
            forward()
            while ( true ) {
                c = source.charAt(i);
                if ( follow.test(c) ) {
                    forward()
                } else {
                    break
                }
            }
            if ( str.length > 1 ) throw new Error('wtf')
            variables[str] = polyrat([0,1])
            return {value: str, to: i}
        }
        return false
    })

    tokenizer.add_type('number', function(source, i){
        var c = source.charAt(i)
            , digits = /[0-9]/
            , letters = /[a-zA-Z]/
            , str = ''
            , n = 0
            ;

        function forward(){
            str += c
            i ++
        }

        if ( digits.test(c) ) {
            forward()
            while ( true ) {
                c = source.charAt(i);
                if ( digits.test(c) ) {
                    forward()
                } else {
                    break
                }
            }
            n = Number(str)
            if ( ! isFinite(n) ) {
                throw new Error('Bad number')
            }
            return {value: n, to: i}
        }
        return false
    })

    tokenizer.add_type('operator', function(source, i){
        var c = source.charAt(i)
            , not_alphanumeric = /[^0-9a-zA-Z]/
            ;
        i++
        return not_alphanumeric.test(c) ? {value: c, to: i } : false

    })

    var original_symbol = {
        nud: function () { throw new Error("Undefined. " + this.id) }
        , led: function (left) { throw new Error("Missing operator. " + this.id) }
    }


    function itself(){ return this }

    function symbol(id, bp){
        var s = symbol_table[id]
            ;
        bp = bp || 0
        if (s) {
            if (bp >= s.lbp) { s.lbp = bp }
        } else {
            s = Object.create(original_symbol)
            s.id = s.value = id
            s.lbp = bp
            symbol_table[id] = s
        }
        return s
    }

    function infix(id, bp, led){
        var s = symbol(id, bp);
        s.led = led || function (left) {
            return expression(bp)
        }
        return s
    }

    function prefix(id, nud){
        var s = symbol(id);
        s.nud = nud || function(){
            return expression(10)
        }
        return s
    }

    function both(id, bp, nud, led){
        var s = symbol(id, bp);
        s.nud = nud || function(){
            return expression(10)
        }
        s.led = led || function (left) {
            return expression(bp)
        }
        return s
    }

    function statement(s, f){
        var x = symbol(s)
        x.std = f
        return x
    }

    function create_token(){
        var token
            , v
            , t
            , arity
            , object
            ;

        t = tokens[token_nr]
        if ( t === undefined ) return
        v = t.value
        arity = t.type
        if (arity ===  "number") {
            token = polyrat([t.value])
            token.nud = itself
        } else if (arity === "variable") {
            token = variables[v]
            token.name = v
            token.nud = itself
        } else {
            if (arity === "operator") {
                object = symbol_table[v]
                if (!object) { throw new Error("Unknown operator. "+v) }
            } else {
                throw new Error("Unexpected token. "+arity)
            }
            token = Object.create(object)
            token.from  = t.from
            token.to    = t.to
            token.value = v
            token.arity = arity
            token.nr = token_nr
        }
        return token
    }

    function advance(id){

        if (id && token.id !== id) { throw new Error("Expected '" + id + "'.") }
        token = create_token()
        token_nr++

    }

    function expression(rbp){
        var left
            , t = token
            ;
        if ( t === undefined ) return
        if (t.std) {
            advance()
            return t.std()
        }
        advance()
        left = t.nud()
        while ( token && token.lbp > rbp ) {
            t = token
            advance()
            left = t.led(left)
        }
        return left
    }

    function parse(source){
        var a = []
            , s
            ;
        a.toString = function(){
            return this.join('\n')
        }
        token_nr = 0
        tokens = tokenizer(source)
        advance()
        while ( token ) {
            s = expression(0)
            if ( s ) {
                 a.push(s)
            } else if ( s === undefined ) {
                break
            }
        }
        return a.length === 0 ? null : a.length === 1 ? a[0] : a;
    }

    symbol("(end)")
    symbol("(variable)").nud = itself
    symbol("(literal)").nud = itself
    both("+", 3, function(){
        var right = expression(3);
        return right == null ? ZERO : right
    }, function(left){
        var right = expression(3);
        return (left == null ? ZERO : left).plus((right == null ? ZERO : right))
    })

    both("-", 3,function(){
        var right = expression(3);
        return NEGONE.times(right == null ? ZERO : right)
    }, function(left){
        var right = expression(3);
        return (left == null ? ZERO : left).minus((right == null ? ZERO : right))
    })

    both("*", 4,function(){
        var right = expression(4);
        return (right == null ? ONE : right)
    }, function(left){
        var right = expression(4);
        return (left == null ? ONE : left).times((right == null ? ONE : right))
    })

    both("/", 4,function(){
        var right = expression(4);
        return ONE.per(right == null ? ONE : right)
    }, function(left){
        var right = expression(4);
        return (left == null ? ONE : left).per((right == null ? ONE : right))
    })

    both("^", 5, function(){
        var right = expression(5);
        return ONE.pow((right == null ? ZERO : right)[0][0])
    }, function(left){
        var right = expression(5);
        return (left == null ? ONE : left).pow((right == null ? ZERO : right)[0][0])
    })


    symbol(")", 0)

    prefix("(", function(){
        var e = expression(0);
        advance(")")
        return e
    })


    infix("=", 2, function(left){
        return variables[left.name] = expression(1)
    })


    statement("variable", function () {
        var a = [], n, t;
        while (true) {
            n = token;
            if (n.arity !== "variable") {
                n.error("Expected a new variable name.");
            }
            advance();
            if (token.id === "=") {
                t = token;
                advance("=");
                t.first = n;
                t.second = expression(0);
                t.arity = "binary";
                a.push(t);
            }
            if (token.id !== ",") {
                break;
            }
            advance(",");
        }
        advance(";");
        return a.length === 0 ? null : a.length === 1 ? a[0] : a;
    })

    both("\n", 0, function(){return null} , function(left){return left})


    if ( module !== undefined && module.exports ) {
        module.exports = parse
    } else {
        root.factory = parse
    }

}(this)

},{"./tokenizer.js":5,"polyrats":6}],6:[function(require,module,exports){// This file is just added for convenience so this repository can be
// directly checked out into a project's deps folder
module.exports = require('./lib/polyrats');

},{"./lib/polyrats":7}],7:[function(require,module,exports){void function(root){
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

},{"rationals":8}],8:[function(require,module,exports){// This file is just added for convenience so this repository can be
// directly checked out into a project's deps folder
module.exports = require('./lib/rats');

},{"./lib/rats":9}],9:[function(require,module,exports){void function(root){
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

},{}]},{},[1]);