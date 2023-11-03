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

        const params = routeLayer.keys.map((k) => {
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

        if (schema.parameters) {
          schema.parameters.forEach((p) => {
            if (!params.find((pp) => p.name === pp.name)) {
              params.push(p)
            }
          })
        }

        operation.parameters = params
        path = pathToRegexp.compile(path)(keys, { encode: (value) => value })
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
  if (typeof thing === 'string') {
    return thing.split('/')
  } else if (thing.fast_slash) {
    return []
  } else {
    const match = thing
      .toString()
      .replace('\\/?', '')
      .replace('(?=\\/|$)', '$')
      .match(/^\/\^((?:\\[.*+?^${}()|[\]\\/]|[^.*+?^${}()|[\]\\/])*)\$\//)
    return match
      ? match[1].replace(/\\(.)/g, '$1').split('/')
      : processComplexMatch(thing, keys)
  }
}
