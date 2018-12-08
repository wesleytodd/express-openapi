'use strict'
// vim: set ts=2 sw=2 expandtab:
const pathToRegexp = require('path-to-regexp')
const serve = require('serve-static')
const Router = require('router')
const path = require('path')

const schemaSymbol = Symbol('schemaMiddleware')
const defaultRoutePrefix = '/openapi'
const minimumViableDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Express App',
    version: '1.0.0'
  },
  paths: {}
}

module.exports = function ExpressOpenApi (_routePrefix, _doc, opts = {}) {
  let routePrefix = _routePrefix || defaultRoutePrefix
  let doc = _doc || minimumViableDocument
  if (typeof routePrefix !== 'string') {
    doc = _routePrefix || doc
    routePrefix = defaultRoutePrefix
  }

  // We need to route a bit, seems a safe addition
  // to use the express router in an express middleware
  const router = new Router()

  // Where the magic happens
  const middleware = function OpenApiMiddleware (req, res, next) {
    router.handle(req, res, next)
  }

  // Expose the current document and prefix
  middleware.routePrefix = routePrefix
  middleware.document = Object.assign({
    openapi: minimumViableDocument.openapi
  }, doc, {
    info: Object.assign({}, minimumViableDocument.info, doc.info),
    paths: Object.assign({}, minimumViableDocument.paths, doc.paths)
  })
  middleware.generateDocument = generateDocument

  // Add a path schema to the document
  middleware.path = function (schema = {}) {
    function schemaMiddleware (req, res, next) {
      next()
    }

    schemaMiddleware[schemaSymbol] = schema
    return schemaMiddleware
  }

  // Component definitions
  middleware.component = function (type, name, description) {
    if (!type) {
      throw new TypeError('Component type is required')
    }

    // Return whole component type
    if (!name && !description) {
      return middleware.document.components && middleware.document.components[type]
    }

    // Return ref to type
    if (name && !description) {
      if (!middleware.document.components || !middleware.document.components[type] || !middleware.document.components[type][name]) {
        throw new Error(`Unknown ${type} ref: ${name}`)
      }
      return { '$ref': `#/components/${type}/${name}` }
    }

    // Define a new component
    middleware.document.components = middleware.document.components || {}
    middleware.document.components[type] = middleware.document.components[type] || {}
    middleware.document.components[type][name] = description

    return middleware
  }
  middleware.schema = middleware.component.bind(null, 'schemas')
  middleware.response = middleware.component.bind(null, 'responses')
  middleware.parameters = middleware.component.bind(null, 'parameters')
  middleware.examples = middleware.component.bind(null, 'examples')
  middleware.requestBodies = middleware.component.bind(null, 'requestBodies')
  middleware.headers = middleware.component.bind(null, 'headers')
  middleware.securitySchemes = middleware.component.bind(null, 'securitySchemes')
  middleware.links = middleware.component.bind(null, 'links')
  middleware.callbacks = middleware.component.bind(null, 'callbacks')

  // Expose ui middleware
  middleware.redoc = serveRedoc(`${routePrefix}.json`)
  middleware.swaggerui = serveSwaggerUI(`${routePrefix}.json`)

  // OpenAPI document as json
  router.get(`${routePrefix}.json`, (req, res) => {
    middleware.document = generateDocument(middleware.document, req.app._router || req.app.router)
    res.json(middleware.document)
  })

  // Serve up the for exploring the document
  if (opts.htmlui) {
    let ui = opts.htmlui
    if (!Array.isArray(opts.htmlui)) {
      ui = [opts.htmlui || 'redoc']
    }
    if (ui.includes('redoc')) {
      router.get(`${routePrefix}`, (req, res) => { res.redirect(`${routePrefix}/redoc`) })
      router.use(`${routePrefix}/redoc`, middleware.redoc)
    }
    if (ui.includes('swagger-ui')) {
      router.get(`${routePrefix}`, (req, res) => { res.redirect(`${routePrefix}/swagger-ui`) })
      router.use(`${routePrefix}/swagger-ui`, middleware.swaggerui)
    }
  }

  return middleware
}

module.exports.minimumViableDocument = minimumViableDocument
module.exports.defaultRoutePrefix = defaultRoutePrefix

function generateDocument (baseDocument, router) {
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
      const schema = layer.handle[schemaSymbol]
      if (schema && layer.method) {
        const operation = {}

        // Add route params to schema
        if (routeLayer && routeLayer.keys && routeLayer.keys.length) {
          const keys = {}

          operation.parameters = routeLayer.keys.map((k) => {
            // Reformat the path
            keys[k.name] = '{' + k.name + '}'

            return {
              name: k.name,
              in: 'path',
              required: !k.optional,
              schema: { type: 'string' }
            }
          })
          path = pathToRegexp.compile(path)(keys, { encode: (value) => value })
        }

        doc.paths[path] = doc.paths[path] || {}
        doc.paths[path][layer.method] = Object.assign(operation, schema)
      }
    })
  })

  return doc
}

function iterateStack (path, routeLayer, layer, cb) {
  cb(path, routeLayer, layer)
  if (!layer.route) {
    return
  }
  layer.route.stack.forEach((l) => iterateStack(path + layer.route.path, layer, l, cb))
}

function serveRedoc (documentUrl) {
  return [serve(path.resolve(require.resolve('redoc'), '..')), function renderRedocHtml (req, res) {
    res.type('html').send(renderHtmlPage(`
      <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    `, `
      <redoc spec-url="${documentUrl}"></redoc>
      <script src="./redoc.standalone.js"></script>
    `))
  }]
}

function serveSwaggerUI (documentUrl) {
  return [serve(path.resolve(require.resolve('swagger-ui-dist'), '..'), { index: false }), function renderSwaggerHtml (req, res) {
    res.type('html').send(renderHtmlPage(`
      <link rel="stylesheet" type="text/css" href="./swagger-ui.css" >
    `, `
      <div id="swagger-ui"></div>
      <script src="./swagger-ui-bundle.js"></script>
      <script src="./swagger-ui-standalone-preset.js"></script>
      <script>
        window.onload = function () {
          window.ui = SwaggerUIBundle({
            url: "${documentUrl}",
            dom_id: '#swagger-ui'
          })
        }
      </script>
    `))
  }]
}

function renderHtmlPage (head, body) {
  return `<!DOCTYPE html>
<html>
  <head>
    <title>ReDoc</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      html {
          box-sizing: border-box;
          overflow: -moz-scrollbars-vertical;
          overflow-y: scroll;
      }
      *,
      *:before,
      *:after {
          box-sizing: inherit;
      }
      body {
        margin: 0;
        padding: 0;
        background: #fafafa;
      }
    </style>
    ${head}
  </head>
  <body>
    ${body}
  </body>
</html> 
  `
}
