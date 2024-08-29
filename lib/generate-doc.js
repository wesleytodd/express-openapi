'use strict'
const pathToRegexp = require('path-to-regexp')
const minimumViableDocument = require('./minimum-doc')
const { get: getSchema, set: setSchema } = require('./layer-schema')

module.exports = function generateDocument (baseDocument, router, basePath) {
  // Merge document with select minimum defaults
  const doc = Object.assign({
    openapi: minimumViableDocument.openapi
  }, baseDocument, {
    info: Object.assign({}, minimumViableDocument.info, baseDocument.info),
    paths: Object.assign({}, minimumViableDocument.paths, baseDocument.paths)
  })

  // Iterate the middleware stack and add any paths and schemas, etc
  router && router.stack.forEach((_layer) => {
    iterateStack('', null, _layer, (path, routeLayer, layer) => {
      if (basePath && path.startsWith(basePath)) {
        path = path.replace(basePath, '')
      }
      const schema = getSchema(layer.handle)
      if (!schema || !layer.method) {
        return
      }

      const operation = Object.assign({}, schema)

      // Add route params to schema
      if (routeLayer && routeLayer.keys && routeLayer.keys.length) {
        const keys = {}

        const params = routeLayer.keys.map((k, i) => {
          const prev = i > 0 && routeLayer.keys[i - 1]
          // do not count parameters without a name if they are next to a named parameter
          if (typeof k.name === 'number' && prev && prev.offset + prev.name.length + 1 >= k.offset) {
            return null
          }
          let param
          if (schema.parameters) {
            param = schema.parameters.find((p) => p.name === k.name && p.in === 'path')
          }

          // Reformat the path
          keys[k.name] = '{' + k.name + '}'

          return Object.assign({
            name: k.name,
            in: 'path',
            required: !k.optional,
            schema: k.schema || { type: 'string' }
          }, param || {})
        })
          .filter((e) => e)

        if (schema.parameters) {
          schema.parameters.forEach((p) => {
            if (!params.find((pp) => p.name === pp.name)) {
              params.push(p)
            }
          })
        }

        operation.parameters = params
        path = pathToRegexp.compile(path.replace(/\*|\(\*\)/g, '(.*)'))(keys, { encode: (value) => value })
      }

      doc.paths[path] = doc.paths[path] || {}
      doc.paths[path][layer.method] = operation
      setSchema(layer.handle, operation)
    })
  })

  return doc
}

function iterateStack (path, routeLayer, layer, cb) {
  cb(path, routeLayer, layer)
  if (layer.name === 'router') {
    layer.handle.stack.forEach(l => {
      path = path || ''
      iterateStack(path + split(layer.regexp, layer.keys).join('/'), layer, l, cb)
    })
  }
  if (!layer.route) {
    return
  }
  if (Array.isArray(layer.route.path)) {
    const r = layer.regexp.toString()
    layer.route.path.forEach((p, i) => iterateStack(path + p, layer, {
      ...layer,
      // Chacking if p is a string here since p may be a regex expression
      keys: layer.keys.filter((k) => typeof p === 'string' ? p.includes(`/:${k.name}`) : false),
      // There may be an issue here if the regex has a '|', but that seems to only be the case with user defined regex
      regexp: new RegExp(`(${r.substring(2, r.length - 3).split('|')[i]})`),
      route: { ...layer.route, path: '' }
    }, cb))
    return
  }
  layer.route.stack.forEach((l) => iterateStack(path + layer.route.path, layer, l, cb))
}

function processComplexMatch (thing, keys) {
  let i = 0

  return thing
    .toString()
    // The replace below replaces the regex used by Express to match dynamic parameters
    // (i.e. /:id, /:name, etc...) with the name(s) of those parameter(s)
    // This could have been accomplished with replaceAll for Node version 15 and above
    // no-useless-escape is disabled since we need three backslashes
    .replace(/\(\?\:\(\[\^\\\/\]\+\?\)\)/g, () => `{${keys[i++].name}}`) // eslint-disable-line no-useless-escape
    .replace(/\\(.)/g, '$1')
    // The replace below removes the regex used at the start of the string and
    // the regex used to match the query parameters
    .replace(/\/\^|\/\?(.*)/g, '')
    .split('/')
}

// https://github.com/expressjs/express/issues/3308#issuecomment-300957572
function split (thing, keys) {
  // In express v5 the router layers regexp (path-to-regexp@3.2.0)
  // has some additional handling for end of lines, remove those
  //
  // layer.regexp
  // v4 ^\\/sub-route\\/?(?=\\/|$)
  // v5 ^\\/sub-route(?:\\/(?=$))?(?=\\/|$)
  //
  // l.regexp
  // v4 ^\\/endpoint\\/?$
  // v5 ^\\/endpoint(?:\\/)?$
  if (typeof thing === 'string') {
    return thing.split('/')
  } else if (thing.fast_slash) {
    return []
  } else {
    const match = thing
      .toString()
      .replace('\\/?', '')
      .replace('(?=\\/|$)', '$')
      // Added this line to catch the express v5 case after the v4 part is stripped off
      .replace('(?:\\/(?=$))?$', '$')
      .match(/^\/\^((?:\\[.*+?^${}()|[\]\\/]|[^.*+?^${}()|[\]\\/])*)\$\//)
    return match
      ? match[1].replace(/\\(.)/g, '$1').split('/')
      : processComplexMatch(thing, keys)
  }
}
