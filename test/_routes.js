'use strict'
const { suite, test } = require('mocha')
const assert = require('assert')
const supertest = require('supertest')
const express = require('express')
const SwaggerParser = require('swagger-parser')
const openapi = require('..')
const _moreRoutes = require('./_moreRoutes')

module.exports = function () {
  suite('routes', function () {
    test('serve OpenAPI document', function (done) {
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

    test('serve components as separate routes', function (done) {
      const app = express()
      const schema = {
        type: 'object',
        properties: {
          hello: {
            type: 'string',
            enum: ['world']
          }
        }
      }

      app.use(openapi({
        components: {
          schema: {
            HelloWorld: schema
          }
        }
      }))
      supertest(app)
        .get(`${openapi.defaultRoutePrefix}/components/schema/HelloWorld.json`)
        .expect(200, (err, res) => {
          assert(!err, err)
          assert.deepStrictEqual(res.body, schema)
          done()
        })
    })

    test('validate and return any errors', function (done) {
      const app = express()

      const oapi = openapi()
      app.use(oapi)
      app.get('/bad-document', oapi.path({
        responses: {
          200: {
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          }
        }
      }))

      supertest(app)
        .get(`${openapi.defaultRoutePrefix}/validate`)
        .expect(200, (err, res) => {
          assert(!err, err)
          assert.deepStrictEqual(res.body.details[0].inner[0].path, ['paths', '/bad-document', 'get', 'responses', '200'])
          assert.strictEqual(res.body.details[0].inner[0].params[0], 'description')
          done()
        })
    })

    test('serve routes in a different file', function (done) {
      const app = express()

      const oapi = openapi()
      app.use(oapi)
      app.use('/:id', _moreRoutes)

      supertest(app)
        .get(`${openapi.defaultRoutePrefix}.json`)
        .expect(200, (err, res) => {
          assert(!err, err)
          assert.strictEqual(Object.keys((res.body.paths))[0], '/{id}/')
          done()
        })
    })

    test('serve routes in an array as different routes', function (done) {
      const app = express()

      const oapi = openapi()
      app.use(oapi)
      app.get(['/route/:a', '/route/b', '/routeC'], oapi.path({
        summary: 'Test route.',
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  type: 'string'
                }
              }
            }
          }
        }
      }))

      supertest(app)
        .get(`${openapi.defaultRoutePrefix}.json`)
        .expect(200, (err, res) => {
          assert(!err, err)
          assert.strictEqual(Object.keys((res.body.paths))[0], '/route/{a}')
          assert.strictEqual(Object.keys((res.body.paths))[1], '/route/b')
          assert.strictEqual(Object.keys((res.body.paths))[2], '/routeC')
          done()
        })
    })
  })
}
