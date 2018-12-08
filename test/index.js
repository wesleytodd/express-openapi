'use strict'
// vim: set ts=2 sw=2 expandtab:
var { describe, it } = require('mocha')
var assert = require('assert')
var util = require('util')
var supertest = require('supertest')
var express = require('express')
var SwaggerParser = require('swagger-parser')
var openapi = require('../')

function logDocument (doc) {
  console.log(util.inspect(doc, { depth: null }))
}

describe('@express/openapi', function () {
  it('should accept no options', function () {
    const oapi = openapi()
    assert.strictEqual(oapi.routePrefix, openapi.defaultRoutePrefix)
    assert.deepStrictEqual(oapi.document, openapi.minimumViableDocument)
  })

  it('should accept no document option', function () {
    const oapi = openapi('/test')
    assert.strictEqual(oapi.routePrefix, '/test')
    assert.deepStrictEqual(oapi.document, openapi.minimumViableDocument)
  })

  it('should accept both a routePrefix and a document', function () {
    const oapi = openapi('/test', {
      info: {
        title: 'Test App'
      }
    })
    assert.strictEqual(oapi.routePrefix, '/test')
    assert.deepStrictEqual(oapi.document, {
      openapi: '3.0.0',
      info: {
        title: 'Test App',
        version: '1.0.0'
      },
      paths: {}
    })
  })

  it('should create a basic valid OpenAPI document and serve it on an express app', function (done) {
    const app = express()
    app.use(openapi())
    supertest(app)
      .get(`${openapi.defaultRoutePrefix}.json`)
      .expect(200, (err, res) => {
        assert(!err, err)
        SwaggerParser.validate(res.body, (err, api) => {
          assert(!err, err)
          assert.deepStrictEqual(api, openapi.minimumViableDocument)
          done()
        })
      })
  })

  it('should load routes from the express app', function (done) {
    const app = express()
    const oapi = openapi()

    const helloWorldSchema = oapi.path({
      responses: {
        200: {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  hello: { type: 'string' }
                }
              }
            }
          }
        }
      }
    })

    app.use(oapi)
    app.get('/foo', helloWorldSchema, (req, res) => {
      res.json({
        hello: 'world'
      })
    })

    supertest(app)
      .get(`${openapi.defaultRoutePrefix}.json`)
      .expect(200, (err, res) => {
        assert(!err, err)
        SwaggerParser.validate(res.body, (err, api) => {
          assert(!err, err)
          done()
        })
      })
  })

  it('should support express array formats', (done) => {
    const app = express()
    const oapi = openapi()

    const emptySchema = oapi.path({
      responses: {
        204: {
          description: 'Successful response',
          content: {
            'application/json': { }
          }
        }
      }
    })

    app.use(oapi)
    app.get('/undocumented', (req, res) => {
      res.status(204).send()
    })
    app.get('/array', [emptySchema, (req, res) => {
      res.status(204).send()
    }])
    app.get('/array-of-arrays', [[emptySchema, (req, res) => {
      res.status(204).send()
    }]])

    supertest(app)
      .get(`${openapi.defaultRoutePrefix}.json`)
      .expect(200, (err, res) => {
        assert(!err, err)
        SwaggerParser.validate(res.body, (err, api) => {
          if (err) {
            logDocument(api)
            done(err)
          }

          assert(api.paths['/array'])
          assert(api.paths['/array'].get)
          assert(api.paths['/array'].get.responses[204])
          assert.strictEqual(api.paths['/array'].get.responses[204].description, 'Successful response')

          assert(api.paths['/array-of-arrays'])
          assert(api.paths['/array-of-arrays'].get)
          assert(api.paths['/array-of-arrays'].get.responses[204])
          assert.strictEqual(api.paths['/array-of-arrays'].get.responses[204].description, 'Successful response')

          assert(!api.paths['/undocumented'])

          done()
        })
      })
  })

  it('should support express route syntax', (done) => {
    const app = express()
    const oapi = openapi()

    const emptySchema = oapi.path({
      responses: {
        204: {
          description: 'Successful response',
          content: {
            'application/json': { }
          }
        }
      }
    })

    app.use(oapi)
    app.route('/route')
      .get(emptySchema, (req, res) => {
        res.status(204).send()
      })
      .put(emptySchema, (req, res) => {
        res.status(204).send()
      })

    app.route('/route-all')
      .all(emptySchema)
      .all((req, res) => {
        res.status(204).send()
      })

    supertest(app)
      .get(`${openapi.defaultRoutePrefix}.json`)
      .expect(200, (err, res) => {
        assert(!err, err)
        SwaggerParser.validate(res.body, (err, api) => {
          if (err) {
            logDocument(api)
            done(err)
          }

          assert(api.paths['/route'])
          assert(api.paths['/route'].get)
          assert(api.paths['/route'].get.responses[204])
          assert.strictEqual(api.paths['/route'].get.responses[204].description, 'Successful response')

          assert(api.paths['/route'].put)
          assert(api.paths['/route'].put.responses[204])
          assert.strictEqual(api.paths['/route'].put.responses[204].description, 'Successful response')

          done()
        })
      })
  })

  it('should support named path params', (done) => {
    const app = express()
    const oapi = openapi()

    const emptySchema = oapi.path({
      responses: {
        204: {
          description: 'Successful response',
          content: {
            'application/json': { }
          }
        }
      }
    })

    app.use(oapi)
    app.get('/:foo', emptySchema, (req, res) => {
      res.status(204).send()
    })

    supertest(app)
      .get(`${openapi.defaultRoutePrefix}.json`)
      .expect(200, (err, res) => {
        assert(!err, err)
        SwaggerParser.validate(res.body, (err, api) => {
          if (err) {
            logDocument(api)
            done(err)
          }

          assert(api.paths['/{foo}'])
          assert(api.paths['/{foo}'].get)
          assert(api.paths['/{foo}'].get.parameters[0])
          assert.strictEqual(api.paths['/{foo}'].get.parameters[0].name, 'foo')

          done()
        })
      })
  })
})
