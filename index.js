'use strict'
const httpErrors = require('http-errors')
const Router = require('router')
const SwaggerParser = require('swagger-parser')
const ui = require('./lib/ui')
const makeValidator = require('./lib/validate')
const { get: getSchema, set: setSchema } = require('./lib/layer-schema')
const minimumViableDocument = require('./lib/minimum-doc')
const generateDocument = require('./lib/generate-doc')
const defaultRoutePrefix = '/openapi'

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

  // Fully generate the doc on the first request
  let isFirstRequest = true

  // Where the magic happens
  const middleware = function OpenApiMiddleware (req, res, next) {
    if (isFirstRequest) {
      middleware.document = generateDocument(middleware.document, req.app._router || req.app.router)
      isFirstRequest = false
    }

    router.handle(req, res, next)
  }

  // Expose the current document and prefix
  middleware.routePrefix = routePrefix
  middleware.document = generateDocument(doc)
  middleware.generateDocument = generateDocument

  // Add a path schema to the document
  middleware.path = function (schema = {}) {
    function schemaMiddleware (req, res, next) {
      next()
    }

    setSchema(schemaMiddleware, schema)
    return schemaMiddleware
  }

  // Validate path middleware
  middleware.validPath = function (schema = {}) {
    let validate
    function validSchemaMiddleware (req, res, next) {
      if (!validate) {
        validate = makeValidator(middleware, getSchema(validSchemaMiddleware))
      }
      return validate(req, res, next)
    }

    setSchema(validSchemaMiddleware, schema)
    return validSchemaMiddleware
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

    // @TODO create id
    // Is this necessary?  The point of this was to provide canonical component ref urls
    // But now I think that might not be necessary.
    // if (!description || !description['$id']) {
    //   const server = middleware.document.servers && middleware.document.servers[0] && middleware.document.servers[0].url
    //   console.log(`${server || '/'}{routePrefix}/components/${type}/${name}.json`)
    //   description['$id'] = `${middleware.document.servers[0].url}/${routePrefix}/components/${type}/${name}.json`
    // }

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
  middleware.redoc = ui.serveRedoc(`${routePrefix}.json`)
  middleware.swaggerui = ui.serveSwaggerUI(`${routePrefix}.json`)

  // OpenAPI document as json
  router.get(`${routePrefix}.json`, (req, res) => {
    middleware.document = generateDocument(middleware.document, req.app._router || req.app.router)
    res.json(middleware.document)
  })
  router.get(`${routePrefix}/components/:type/:name.json`, (req, res, next) => {
    const { type, name } = req.params
    middleware.document = generateDocument(middleware.document, req.app._router || req.app.router)

    // No component by that identifer
    if (!middleware.document.components[type] || !middleware.document.components[type][name]) {
      return next(httpErrors(404, `Component does not exist: ${type}/${name}`))
    }

    // Return component
    res.json(middleware.document.components[type][name])
  })

  // Validate full open api document
  router.get(`${routePrefix}/validate`, (req, res) => {
    middleware.document = generateDocument(middleware.document, req.app._router || req.app.router)
    SwaggerParser.validate(middleware.document, (err, api) => {
      if (err) {
        return res.json({
          valid: false,
          details: err.details,
          document: middleware.document
        })
      }
      res.json({
        valid: true,
        document: middleware.document
      })
    })
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
