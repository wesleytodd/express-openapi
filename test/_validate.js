'use strict'
var { suite, test } = require('mocha')
var assert = require('assert')
var supertest = require('supertest')
var express = require('express')
var openapi = require('..')

module.exports = function () {
  suite('validate', function () {
    test('validate incoming requests', async function () {
      const app = express()
      const oapi = openapi()

      app.use(express.json(), oapi)
      app.post('/:foo', oapi.validPath({
        parameters: [{
          name: 'num',
          in: 'query',
          schema: { type: 'number' }
        }, {
          name: 'x-Custom-Header',
          in: 'header',
          required: true,
          schema: { type: 'string' }
        }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  hello: { type: 'string', enum: ['world'] }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    goodbye: { type: 'string', enum: ['moon'] }
                  }
                }
              }
            }
          }
        }
      }), (req, res) => {
        res.status(200).json({
          goodbye: 'moon'
        })
      }, (err, req, res, next) => {
        assert(err)
        res.status(err.statusCode).json(err)
      })

      const res1 = await supertest(app)
        .post('/bar')
        .set('X-Custom-Header', 'value')
        .send({
          hello: 'world',
          foo: 'bar'
        })

      assert.strictEqual(res1.statusCode, 200)
      assert.strictEqual(res1.body.goodbye, 'moon')

      const res2 = await supertest(app)
        .post('/bar')
        .set('X-Custom-Header', 'value')
        .send({
          hello: 'bad boy',
          foo: 'bar'
        })

      assert.strictEqual(res2.statusCode, 400)
      assert.strictEqual(res2.body.validationErrors[0].dataPath, '.body.hello')

      const res3 = await supertest(app)
        .post('/bar')
        .send({
          hello: 'world',
          foo: 'bar'
        })

      assert.strictEqual(res3.statusCode, 400)
      assert.strictEqual(res3.body.validationErrors[0].dataPath, '.headers')
      assert.strictEqual(res3.body.validationErrors[0].params.missingProperty, 'x-custom-header')
    })
  })
}
