/**
 * The Sea.js plugin for collecting HTTP requests and sending all at once
 */
(function(seajs) {

  var Module = seajs.Module
  var load = Module.prototype.load

  var data = seajs.data
  var stack = data.flushStack = []
  var stacked = data.fulshStacked = {}


  Module.prototype.load = function() {
    var mod = this

    // DO NOT delay preload modules
    if(isPreload(mod)){
      load.call(mod)
    }
    // delay unstacked mod
    else if(!stacked[mod.uri]){
      stack.push(mod)
      stacked[mod.uri] = 1
    }
    else {
      load.call(mod)
    }
  }

  seajs.use = function(ids, callback) {
    Module.use(ids, callback, data.cwd + "_use_" + data.cid())
    return seajs
  }

  seajs.flush = function() {
    var len = stack.length
    if (len === 0) {
      return
    }

    var currentStack = stack.splice(0, len)
    var deps = []

    // Collect dependencies
    for (var i = 0; i < len; i++) {
      deps = deps.concat(currentStack[i].resolve())
    }
    
    // Unique Uris 
    deps = uniqueUris(deps)

    // Create an anonymous module for flushing
    var mod = Module.get(
        data.cwd + "_flush_" + data.cid(),
        deps
    )

    mod.load = load

    mod.callback = function() {
      for (var i = 0; i < len; i++) {
        currentStack[i].onload()
      }
      
      delete this.callback
    }

    // Load it
    Module.preload(function() {
      mod.load()
    })
  }


  // Flush to load dependencies
  seajs.on("requested", function() {
    seajs.flush()
  })

  // Flush to load `require.async` when module.factory is executed
  seajs.on("exec", function() {
    seajs.flush()
  })


  // Helpers

  var PRELOAD_RE = /\/_preload_\d+$/

  function isPreload(mod) {
    if (PRELOAD_RE.test(mod.uri)) {
      return true
    }

    for (var uri in mod._waitings) {
      if (isPreload(seajs.cache[uri])) {
        return true
      }
    }

    return false
  }
  
  function uniqueUris(uris){
    var ret = []
    var tmp = {}
    var uri
    
    for(var i = 0; i < uris.length; i++){
      uri = uris[i]

      if(!tmp[uri]){
        tmp[uri] = 1
      	ret.push(uri)
      }
    }

    return ret
  }


  // Register as module
  define("seajs-flush", [], {})

})(seajs);

