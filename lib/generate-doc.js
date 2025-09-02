'use strict'

const minimumViableDocument = require('./minimum-doc')
const { get: getSchema, set: setSchema } = require('./layer-schema')

function assignRoutes (router, doc, basePath, prefixPath = '', iter = 0, stripped = false) {
  // Retrieve all instances of middleware with prefix routes
  const subRoutes = router.stack.filter((r) => r.name === 'router')

  if (subRoutes.length > 0) {
    subRoutes.forEach((routeLayer) => {
      const p = router.getRoutes()[0].path.split('/')[1]

      if (prefixPath.replaceAll('/', '').trim() !== p || iter > 1) {
        prefixPath += `/${p}` // Prevents basePath from being added twice
      } else {
        stripped = true // Set stripped to true for later
      }

      iter += 1
      // Assign the routes to the OpenAPI document
      doc = Object.assign(doc, assignRoutes(routeLayer.handle, doc, basePath, prefixPath, iter, stripped))
    })
  }

  // Retrieve all instances of middleware attached to a route
  const routes = router.stack.filter((e) => e.route)

  routes.forEach((routeLayer) => {
    const paths = [routeLayer.route.path].flat()
    const layers = routeLayer.route.stack.filter((s) =>
      ['OpenApiMiddleware', 'schemaMiddleware', 'validSchemaMiddleware'].includes(s.name) && s.method
    )

    if (layers.length > 0) {
      layers.forEach((layer) => {
        const schema = getSchema(layer.handle) // Retrieve the schema defined inside of the Openapi related middleware
        if (!schema || !layer.method) return

        paths.forEach((path) => {
          const params = []
          let paramIndex = 0

          // Retrieve parameters defined inside the schema
          if (schema.parameters && schema.parameters.length) {
            params.push(...schema.parameters)
          }

          // Iterate over parts of the path to find undefined parameters
          path = `${prefixPath}${path}`.split('/').map((p) => {
            let name = p.slice(1)
            if (p && [':', '*'].includes(p[0])) {
              if (p.length === 1 && p === '*') {
                name = paramIndex++
              }
              if (!params.some((param) => param.name === name && param.in === 'path')) {
                params.push({
                  name,
                  in: 'path',
                  required: true,
                  schema: { type: 'string' }
                })
              }
              return `{${name}}` // Format the parameter for OpenAPI
            }
            return p
          }).join('/')

          // Remove basePath if the route has not been stripped
          if (!stripped && basePath && path.startsWith(basePath)) {
            path = path.slice(basePath.length)
          }

          // Assign the parameters back to the schema
          schema.parameters = params

          // Object.assign schema to operation
          const operation = Object.assign({}, schema)

          // Configure the OpenAPI documentation for the path and the operation
          doc.paths[path] = doc.paths[path] || {}
          doc.paths[path][layer.method] = operation

          // Reconfigure the schema with the operation
          setSchema(layer.handle, operation)
        })
      })
    }
  })

  return doc
}

module.exports = function generateDocument (baseDocument, router, basePath) {
  // Create the default OpenAPI document
  let doc = {
    ...minimumViableDocument,
    ...baseDocument,
    info: { ...minimumViableDocument.info, ...baseDocument.info },
    paths: { ...minimumViableDocument.paths, ...baseDocument.paths }
  }

  // Configure the base path if it was assigned
  const base = basePath || ''

  if (router) {
    // When routes are defined, assign them to the final OpenAPI document
    doc = Object.assign(doc, assignRoutes(router, doc, base))
  }

  return doc
}
