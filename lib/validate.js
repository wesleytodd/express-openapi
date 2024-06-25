'use strict'
const Ajv = require('ajv')
const addFormats = require('ajv-formats')
const addKeywords = require('ajv-keywords')
const httpErrors = require('http-errors')
const merge = require('merge-deep')

const BASE_REQ_SCHEMA = {
  type: 'object',
  required: ['headers', 'params', 'query'],
  properties: {
    headers: {
      type: 'object',
      required: [],
      properties: {}
    },
    params: {
      type: 'object',
      required: [],
      properties: {}
    },
    query: {
      type: 'object',
      required: [],
      properties: {}
    },
    body: {
      type: 'object',
      required: [],
      properties: {}
    }
  }
}

module.exports = function makeValidatorMiddleware (middleware, schema, opts) {
  let ajv
  let validate

  function makeValidator () {
    const reqSchema = merge({}, BASE_REQ_SCHEMA)

    // Compile req schema on first request
    // Build param validation
    schema.parameters && schema.parameters.forEach((p) => {
      switch (p.in) {
        case 'path':
          reqSchema.properties.params.properties[p.name] = p.schema
          p.required && !reqSchema.properties.params.required.includes(p.name) && reqSchema.properties.params.required.push(p.name)
          break
        case 'query':
          reqSchema.properties.query.properties[p.name] = p.schema
          p.required && !reqSchema.properties.query.required.includes(p.name) && reqSchema.properties.query.required.push(p.name)
          break
        case 'header': {
          const name = p.name.toLowerCase()
          reqSchema.properties.headers.properties[name] = p.schema
          p.required && !reqSchema.properties.headers.required.includes(p.name) && reqSchema.properties.headers.required.push(name)
          break
        }
      }
    })

    // Compile req body schema
    schema.requestBody && Object.entries(schema.requestBody.content)
      .forEach(([contentType, { schema }]) => {
        switch (contentType) {
          case 'application/json':
            reqSchema.properties.body = schema
            break
          default:
            throw new TypeError(`Validation of content type not supported: ${contentType}`)
        }
      })

    // Add components for references
    reqSchema.components = middleware.document && middleware.document.components

    return ajv.compile(reqSchema)
  }

  return function validateMiddleware (req, res, next) {
    // Restrict validation to only "route" layers
    // This prevents running any validation
    // if we are in a .use call which could
    // be a non-routable request thus
    if (!req.route) {
      return next()
    }

    // Create ajv instance on first request
    if (!ajv) {
      ajv = new Ajv({
        coerceTypes: opts.coerce === 'false' ? opts.coerce : true,
        strict: opts.strict === true ? opts.strict : false
      })
      addFormats(ajv)

      if (opts.keywords) { addKeywords(ajv, opts.keywords) }
    }

    if (!validate) {
      validate = makeValidator()
    }

    // Validate request
    let r = req
    if (opts.coerce !== true) {
      r = makeReqCopy(req)
    }
    const validationStatus = validate(r)
    if (validationStatus === true) {
      return next()
    }

    // build error?
    const err = new Error('Request validation failed')
    err.validationErrors = validate.errors
    err.validationSchema = validate.schema
    next(httpErrors(400, err))
  }
}

// This is because ajv modifies the original data,
// preventing this requires that we dont pass the
// actual req.  An issue has been opened (@TODO open the issue)
function makeReqCopy (req) {
  return JSON.parse(JSON.stringify({
    headers: req.headers,
    params: req.params,
    query: req.query,
    body: req.body
  }))
}
