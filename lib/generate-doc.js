'use strict'

const minimumViableDocument = require('./minimum-doc')
const { get: getSchema, set: setSchema } = require('./layer-schema')
const listRoutes = require('./list-routes')

function joinPath (prefixPath, path) {
  if (path === undefined || path === '/') return prefixPath
  return `${prefixPath}${path}`
}

function assignRoutes (router, doc, basePath, prefixPath = '') {
  listRoutes(router).forEach(({ path, router: subRouter, route }) => {
    if (subRouter) {
      doc = Object.assign(doc, assignRoutes(subRouter, doc, basePath, joinPath(prefixPath, path)))
      return
    }

    const paths = [path]
    const layers = route.stack.filter((s) =>
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

          if (basePath && path.startsWith(basePath)) {
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
