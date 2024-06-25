'use strict'
const { suite, test } = require('mocha')
const assert = require('assert')
const supertest = require('supertest')
const express = require('express')
const openapi = require('..')

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
                  hello: { type: 'string', enum: ['world'] },
                  birthday: { type: 'string', format: 'date' }
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
          goodbye: 'moon',
          num: req.query.num
        })
      }, (err, req, res, next) => {
        assert(err)
        res.status(err.statusCode).json(err)
      })

      const res1 = await supertest(app)
        .post('/bar?num=123')
        .set('X-Custom-Header', 'value')
        .send({
          hello: 'world',
          foo: 'bar'
        })

      assert.strictEqual(res1.statusCode, 200)
      assert.strictEqual(res1.body.goodbye, 'moon')
      assert.strictEqual(res1.body.num, '123')

      const res2 = await supertest(app)
        .post('/bar')
        .set('X-Custom-Header', 'value')
        .send({
          hello: 'bad boy',
          foo: 'bar'
        })

      assert.strictEqual(res2.statusCode, 400)
      assert.strictEqual(res2.body.validationErrors[0].instancePath, '/body/hello')

      const res3 = await supertest(app)
        .post('/bar')
        .send({
          hello: 'world',
          foo: 'bar'
        })

      assert.strictEqual(res3.statusCode, 400)
      assert.strictEqual(res3.body.validationErrors[0].instancePath, '/headers')
      assert.strictEqual(res3.body.validationErrors[0].params.missingProperty, 'x-custom-header')

      const res4 = await supertest(app)
        .post('/bar?num=123')
        .set('X-Custom-Header', 'value')
        .send({
          hello: 'world',
          birthday: 'bad date',
          foo: 'bar'
        })

      assert.strictEqual(res4.statusCode, 400)
      assert.strictEqual(res4.body.validationErrors[0].instancePath, '/body/birthday')

      app.put('/zoom', oapi.validPath({
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', not: { regexp: '/^[A-Z]/' } }
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
      }, { keywords: ['regexp'] }), (req, res) => {
        res.status(200).json({
          goodbye: 'moon',
          num: req.query.num
        })
      }, (err, req, res, next) => {
        assert(err)
        res.status(err.statusCode).json(err)
      })

      const res5 = await supertest(app)
        .put('/zoom')
        .send({
          hello: 'world',
          foo: 'bar',
          name: 'abc'
        })

      assert.strictEqual(res5.statusCode, 200)

      const res6 = await supertest(app)
        .put('/zoom')
        .send({
          hello: 'world',
          foo: 'bar',
          name: 'Abc'
        })

      assert.strictEqual(res6.statusCode, 400)
      assert.strictEqual(res6.body.validationErrors[0].instancePath, '/body/name')

      app.get('/me', oapi.validPath({
        parameters: [{
          name: 'q',
          in: 'query',
          schema: {
            type: 'string',
            regexp: {
              pattern: '^o',
              flags: 'i'
            }
          }
        }],
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
      }, { keywords: ['regexp'] }), (req, res) => {
        res.status(200).json({
          goodbye: 'moon'
        })
      }, (err, req, res, next) => {
        assert(err)
        res.status(err.statusCode).json(err)
      })

      const res7 = await supertest(app)
        .get('/me?q=123')

      assert.strictEqual(res7.statusCode, 400)
      assert.strictEqual(res7.body.validationErrors[0].instancePath, '/query/q')

      const res8 = await supertest(app)
        .get('/me?q=oops')

      assert.strictEqual(res8.statusCode, 200)
      assert.strictEqual(res8.body.goodbye, 'moon')
    })

    test('coerce types on req', async function () {
      const app = express()
      const oapi = openapi(null, {
        coerce: true
      })

      app.use(oapi)
      app.post('/', oapi.validPath({
        parameters: [{
          name: 'num',
          in: 'query',
          schema: { type: 'number' }
        }]
      }), (req, res) => {
        res.status(200).json({
          num: req.query.num,
          numType: typeof req.query.num
        })
      }, (err, req, res, next) => {
        assert(err)
        res.status(err.statusCode).json(err)
      })

      const res1 = await supertest(app)
        .post('/?num=123')
        .send()

      assert.strictEqual(res1.statusCode, 200)
      assert.strictEqual(res1.body.num, 123)
      assert.strictEqual(res1.body.numType, 'number')
    })
  })
}
