'use strict'
var { suite, test } = require('mocha')
var assert = require('assert')
var supertest = require('supertest')
var express = require('express')
var SwaggerParser = require('swagger-parser')
var openapi = require('..')

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
  })
}
