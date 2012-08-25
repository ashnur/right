(function(){var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var cached = require.cache[resolved];
    var res = cached? cached.exports : mod();
    return res;
};

require.paths = [];
require.modules = {};
require.cache = {};
require.extensions = [".js",".coffee"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            x = path.normalize(x);
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = path.normalize(x + '/package.json');
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key);
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

(function () {
    var process = {};
    
    require.define = function (filename, fn) {
        if (require.modules.__browserify_process) {
            process = require.modules.__browserify_process();
        }
        
        var dirname = require._core[filename]
            ? ''
            : require.modules.path().dirname(filename)
        ;
        
        var require_ = function (file) {
            var requiredModule = require(file, dirname);
            var cached = require.cache[require.resolve(file, dirname)];

            if (cached && cached.parent === null) {
                cached.parent = module_;
            }

            return requiredModule;
        };
        require_.resolve = function (name) {
            return require.resolve(name, dirname);
        };
        require_.modules = require.modules;
        require_.define = require.define;
        require_.cache = require.cache;
        var module_ = {
            id : filename,
            filename: filename,
            exports : {},
            loaded : false,
            parent: null
        };
        
        require.modules[filename] = function () {
            require.cache[filename] = module_;
            fn.call(
                module_.exports,
                require_,
                module_,
                module_.exports,
                dirname,
                filename,
                process
            );
            module_.loaded = true;
            return module_.exports;
        };
    };
})();


require.define("path",function(require,module,exports,__dirname,__filename,process){function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};
});

require.define("__browserify_process",function(require,module,exports,__dirname,__filename,process){var process = module.exports = {};

process.nextTick = (function () {
    var queue = [];
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;
    
    if (canPost) {
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);
    }
    
    return function (fn) {
        if (canPost) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        }
        else setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    if (name === 'evals') return (require)('vm')
    else throw new Error('No such module. (Possibly not yet loaded)')
};

(function () {
    var cwd = '/';
    var path;
    process.cwd = function () { return cwd };
    process.chdir = function (dir) {
        if (!path) path = require('path');
        cwd = path.resolve(dir, cwd);
    };
})();
});

require.define("/node_modules/bean/package.json",function(require,module,exports,__dirname,__filename,process){module.exports = {"main":"./bean.js"}});

require.define("/node_modules/bean/bean.js",function(require,module,exports,__dirname,__filename,process){/*!
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
});

require.define("/node_modules/prsr/package.json",function(require,module,exports,__dirname,__filename,process){module.exports = {"main":"./index"}});

require.define("/node_modules/prsr/index.js",function(require,module,exports,__dirname,__filename,process){// This file is just added for convenience so this repository can be
// directly checked out into a project's deps folder
module.exports = require('./lib/prsr')
});

require.define("/node_modules/prsr/lib/prsr.js",function(require,module,exports,__dirname,__filename,process){void function(root){
    "use strict"

    var piper = require('piper')
        , ONE, ZERO
        , defaults = {}
        , spce = require('spce')
        , sybs = {}
        , tkns = []
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
        return tknzr.call(input)
    }

    function tknzr(){

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

    function sybl(token, lvl){
        var x
            ;
        if ( lvl == null ) {
            lvl = 1
        }
        this.lvl = lvl
        this.toString = token.toString
        x = extend(token, this)
        return x
    }

    function variable(name){
        return spce.push(name)
    }

    function symblzr(token, lvl, slv){
        var s, type, value;
        s = this[token.toString()]
        if ( s == null ) {
            s = new sybl(token, lvl)
            value = s != null ? s.toString() : void 0
            type = s != null ? s.type : void 0
            if ( type === 'var' ) {
                s = piper([0,1])
                s.lvl = 1
            } else if ( type === 'operator' ) {
                s.slv = (slv != null) ? slv : (function() {
                    console.error(this)
                    throw new Error('undefined operator')
                })
            } else if ( type === 'number' ) {
                s = piper([value])
                s.lvl = 1
            }
            this[token.toString()] = s
        }
        return s
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
        r = symblzr.call(sybs, ctok, 1, (function(right){
            return right
        }))
        return r
    }

    ZERO = literal("0")

    ONE = literal("1")

    symblzr.call(defaults, ct("\n"), -1, (function(l, r){
        if ( l == null ) {
            l = ZERO
        }
        return literal(l)
    }))

    symblzr.call(defaults, ct("+"), 2, (function(l, r){
        if ( l == null ) {
            l = ZERO
        }
        if ( r == null ) {
            r = ZERO
        }
        return literal(l.plus(r))
    }))

    symblzr.call(defaults, ct("-"), 2, (function(l, r){
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

    symblzr.call(defaults, ct("*"), 3, (function(l, r){
        if ( l == null ) {
            l = ONE
        }
        if ( r == null ) {
            r = ONE
        }
        return literal(l.times(r))
    }))

    symblzr.call(defaults, ct("/"), 3, (function(l, r){
        if ( l == null ) {
            l = ONE
        }
        if ( r == null ) {
            r = ONE
        }
        return literal(l.per(r))
    }))

    symblzr.call(defaults, ct("^"), 4, (function(l, r){
        if ( l == null ) {
            l = ONE
        }
        if ( r == null ) {
            r = ZERO
        }
        //this is freakingly ugly
        return literal(piper([l.pow(r[0][0][0])]))
    }))

    symblzr.call(defaults, ct(")"), 0, (function(l){
        return literal(l)
    }))

    symblzr.call(defaults, ct("("), 10, (function(l,r){
        var e = expr(0)
            ;
        tkns.shift()
        return e
    }))

    symblzr.call(defaults, ct("="), 11, (function(l,r){
        if ( l == null || r == null ) throw new Error ('equations have two sides' )
        return null
    }))

    function symbolize(tokens){
        var token, i, len
            ;
        sybs = extend({}, defaults)
        for ( i = 0, len = tokens.length; i < len; i++ ) {
            token = tokens[i]
            symblzr.call(sybs, token)
        }
        return sybs
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
        var key =  (tkns[i] != null) ? tkns[i].toString() : void 0
            ;
        return sybs[key]
    }

    function c(i){
        var key = tkns.splice(i, 1, null)[0]
            ;
        return sybs[key]
    }

    function x(i){
        var key = tkns.splice(i, 1)[0]
            ;
        if ( key instanceof Int32Array ) {
            return key
        }
        return sybs[key]
    }

    function g(i, o){
        return tkns.splice(i, 1, o)
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
            if ( i === 1 ) lhs = tkns.shift()
            tkns.shift()
            rhs = null
            paren = true
        } else if ( v(i+1) === 10 ) {
            if ( i === 1 ) lhs = tkns.shift()
            tkns.shift()
            rhs = expr(0)
            tkns.shift()
            paren = true
        } else if ( ! isop(i + 1) ) {
            rhs = x(i + 1)
        } else {
            rhs = null
        }
        if ( paren ) {
            ret = tkns.splice(0, 0, operator.slv(null, rhs))
            if ( lhs !== null ) tkns.splice(0, 0, lhs)
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
        tkns = tokenize(input)
        sybs = symbolize(tkns)
        spce.del('input')
        counter = 0
        while ( tkns.length > 0 ) {
            e = expr(-1)
            spce.push('input', e)
            if ( typeof tkns[0] !== 'undefined'
                && typeof sybs[tkns[0].value] !== 'undefined'
                && sybs[tkns[0].value].lvl === -1 ) {
                    tkns.shift()
            }
            if (++counter > 100) {
                throw new Error('possible infinite loop')
            }
        }
        return spce.get('input')
    }
    if ( typeof module != 'undefined' && module.exports ) {
        module.exports = parse
    } else {
        root.factory = parse
    }

}(this)
});

require.define("/node_modules/piper/package.json",function(require,module,exports,__dirname,__filename,process){module.exports = {"main":"index"}});

require.define("/node_modules/piper/index.js",function(require,module,exports,__dirname,__filename,process){// This file is just added for convenience so this repository can be
// directly checked out into a project's deps folder
module.exports = require('./lib/piper');
});

require.define("/node_modules/piper/lib/piper.js",function(require,module,exports,__dirname,__filename,process){void function(root){
    "use strict"

    var num, pns = {}, rat;

    rat = require('rats')

    function rtrim(arr){
        while ( arr.length > 1 && arr[arr.length-1] === rat(0)  ) {
            arr.pop()
        }
        return arr
    }

    function checkForZero(arr){
        var len = arr.length
            , i, r, t;
        for ( i=0; i<len; i++ ) {
            if ( typeof arr[i].val !== 'undefined' ) {
                r = Math.abs(arr[i].val())
            } else {
                r = Math.abs(arr[i])
            }
            if ( typeof r !== 'undefined' ) {
                if ( r > 0  ) {
                    if ( typeof t === 'undefined' ) t = 0
                    if ( i > t ) t = i
                }
            }
        }
        return t
    }

    function degree(arr){
        if ( typeof arr === 'undefined' && typeof this === 'undefined' ) {
            throw new Error('missing argument')
        }
        var arr = (typeof arr === 'undefined') ? this : arr
            , t1, t2 ;
            if ( arr instanceof polyrat ) {
                t1 = checkForZero(arr[0])
                t2 = checkForZero(arr[1])
            } else if ( Array.isArray(arr) ) {
                return checkForZero(arr)
            } else {
                throw new Error('dafuq')
            }
        return t1 > t2 ? t1 : t2
    }

    function divide(p, q){
        var n, u, v, k, j, s=[], r=[]
            , pdeg = degree(p), qdeg = degree(q);
        u = p.slice(0)
        v = q.slice(0)
        for ( k = pdeg - qdeg ; k >= 0 ; k-- ) {
            s[k] = u[qdeg+k].per(v[qdeg])
            for ( j = qdeg + k  ; j >= k ; j-- ) {
                u[j] = u[j].minus(s[k].times(v[j-k]))
            }
        }
        s = rtrim(s)
        u = rtrim(u)
        return [s,u]
    }

    function gcd(p, q){
        var f = p, g = q,s, t, w=1;
        while ( degree(f) > 0 && degree(g) > 0 )  {
            t = g
            s = divide(f, g)
            if ( typeof degree(s[1]) === 'undefined' ) return piper(t)
            g = s[1]
            f = t
        }
        return piper([1])
    }

    function hashify(){
        return '['+this[0].join(',')+']/['+this[1].join(',')+']'
    }

    function plus(input, input2){
        var len, i, l, r, result=[];
        if ( input.length > input2.length ) {
            len = input.length
        } else {
            len = input2.length
        }
        for ( i = 0; i < len; i++ ) {
            l = typeof input[i] !== 'undefined' ? input[i] : rat(0)
            r = typeof input2[i] !== 'undefined' ? input2[i] : rat(0)
            result[i] = l.plus(r)
        }
        return result
    }

    function minus(input, input2){
        var len, i, l, r, result=[];
        if ( input.length > input2.length ) {
            len = input.length
        } else {
            len = input2.length
        }
        for ( i = 0; i < len; i++ ) {
            l = typeof input[i] !== 'undefined' ? input[i] : rat(0)
            r = typeof input2[i] !== 'undefined' ? input2[i] : rat(0)
            result[i] = l.minus(r)
        }
        return result
    }

    function times(input, input2){
        var p, plen, q, qlen, i, j, result=[];
        p = input.slice(0)
        plen = input.length
        q = input2.slice(0)
        qlen = input2.length
        for ( i=0; i<plen; i++ ){
            for ( j=0; j<qlen; j++ ){
                if ( typeof result[i+j] === 'undefined' ) result[i+j] = rat(0)
                if ( typeof p[i+j] === 'undefined' ) p[i+j] = rat(0)
                if ( typeof q[i+j] === 'undefined' ) q[i+j] = rat(0)

                result[i+j] = result[i+j].plus(p[i].times(q[j]))
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
        if ( ! rat.isInt( input2 ) ) {
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
        if ( degree(input) === 0 ) result = result[0][0]
        return result
    }

    function val(input, input2){
        var n = piper([0]), d = piper([0]),len, i;
        if ( ! ( input2 instanceof polyrat ) ) {
            if ( Array.isArray(input2) ) {
                input2 = piper(input2)
            } else {
                input2 = piper([input2])
            }
        }
        len = input[0].length
        for ( i=0; i < len; i++ ) {
            n = n.plus(piper([input[0][i]]).times(piper([input2.pow(i)])))
        }
        len = input[1].length
        for ( i=0; i < len; i++ ) {
            d = d.plus(piper([input[1][i]]).times(piper([input2.pow(i)])))
        }
        return piper(n, d)
    }

    function polyrat(){}

    polyrat.prototype.hashify = hashify

    polyrat.prototype.toString = hashify

    polyrat.prototype.degree = degree

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
            if ( typeof denominator == 'undefined' ) {
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
            numerator = numerator.map(rat.checkInput)
        }

        if ( ! Array.isArray(denominator) ) {
            denominator = [rat(1)]
        } else {
            denominator = denominator.map(rat.checkInput)
        }
        dd = checkForZero(denominator)
        if ( typeof dd  === 'undefined' ) {
            throw new Error('the denominator must not equal 0')
        }

        numerator = rtrim(numerator)
        denominator = rtrim(denominator)

        if (  Math.abs(denominator[0].val()) !== 1 ) {
            if ( dd > 0 ) {
                divisor = gcd(numerator, denominator)
                if ( Math.abs(degree(divisor[0])) > 0 || divisor[0][0] !== rat(1) ) {
                    numerator = divide(numerator, divisor[0])[0]
                    denominator = divide(denominator, divisor[0])[0]
                }
            } else if ( checkForZero(numerator) === 0 ) {
                numerator = [numerator[0].per(denominator[0])]
                denominator = [rat(1)]
            }
        }

        if (  Math.abs(numerator[0].val()) === 0 ) {
            denominator = [rat(1)]
        }

        intvals = numerator.map(function(o){ return rat.toIntValues(o.val())})
        idx = '['+numerator.join(',')+']/['+denominator.join(',')+']'

        if ( typeof pns[idx] === 'undefined' ) {
            pns[idx] = new polyrat
            pns[idx][0] = numerator
            pns[idx][1] = denominator
        }


        return pns[idx]
    }

    piper.polyrat = polyrat

    if ( typeof module != 'undefined' && module.exports )
        module.exports = piper
    else
        root.factory = piper

}(this)
});

require.define("/node_modules/rats/package.json",function(require,module,exports,__dirname,__filename,process){module.exports = {"main":"index"}});

require.define("/node_modules/rats/index.js",function(require,module,exports,__dirname,__filename,process){// This file is just added for convenience so this repository can be
// directly checked out into a project's deps folder
module.exports = require('./lib/rats');
});

require.define("/node_modules/rats/lib/rats.js",function(require,module,exports,__dirname,__filename,process){void function(root){
    "use strict"

    var numbers = {};

    function isInt(input){
        return typeof input !== 'object' && parseInt(input, 10) == input
    }

    function toIntValues(x){
        if ( x > 0 ) {
            return [x + 1, 1]
        } else {
            return [1, Math.abs(x) + 1]
        }
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
        var intvals = toIntValues(this[0])
        return '('+intvals[0]+"\\"+intvals[1]+')/'+this[1]
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

        var intvals, index, divisor;

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

        intvals = toIntValues(numerator)
        index = '('+intvals[0]+"\\"+intvals[1]+')/'+denominator

        if ( typeof numbers[index] === 'undefined' ) {
            numbers[index] = new Int32Array(2)
            numbers[index][0] = numerator
            numbers[index][1] = denominator
            numbers[index].toString = hashify
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
    rat.toIntValues = toIntValues

    if ( typeof module !== 'undefined' && module.exports ) {
        module.exports = rat
    } else {
        root.factory = rat
    }

}(this)
});

require.define("/node_modules/spce/package.json",function(require,module,exports,__dirname,__filename,process){module.exports = {"main":"./index"}});

require.define("/node_modules/spce/index.js",function(require,module,exports,__dirname,__filename,process){// This file is just added for convenience so this repository can be
// directly checked out into a project's deps folder
module.exports = require('./lib/spce');
});

require.define("/node_modules/spce/lib/spce.js",function(require,module,exports,__dirname,__filename,process){void function(root){

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
});

require.define("/right.js",function(require,module,exports,__dirname,__filename,process){"use strict"
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
});
require("/right.js");
})();
