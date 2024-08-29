'use strict'
const { suite, test } = require('mocha')
const assert = require('assert')
const supertest = require('supertest')
const express = require('express')
const openapi = require('..')

module.exports = function () {
  suite('regex routes', function () {
    test('serve routes with a * wildcard', function (done) {
      const app = express()

      const oapi = openapi()
      app.use(oapi)
      app.get('/route/:param*', oapi.path({
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
          assert.strictEqual(Object.keys((res.body.paths))[0], '/route/{param}')
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters.length, 2)
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters[0].in, 'path')
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters[0].name, 'param')
          done()
        })
    })

    test('serve routes with a * wildcard in parentheses', function (done) {
      const app = express()

      const oapi = openapi()
      app.use(oapi)
      app.get('/route/:param(*)', oapi.path({
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
          assert.strictEqual(Object.keys((res.body.paths))[0], '/route/{param}')
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters.length, 1)
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters[0].in, 'path')
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters[0].name, 'param')
          done()
        })
    })

    test('serve routes in an array as different routes when one route has a * wildcard', function (done) {
      const app = express()

      const oapi = openapi()
      app.use(oapi)
      app.get(['/route/:param*', '/route/b', '/routeC'], oapi.path({
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
          assert.strictEqual(Object.keys((res.body.paths))[0], '/route/{param}')
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters.length, 1)
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters[0].in, 'path')
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters[0].name, 'param')
          assert.strictEqual(Object.keys((res.body.paths))[1], '/route/b')
          assert.strictEqual(Object.keys((res.body.paths))[2], '/routeC')
          done()
        })
    })

    test('serve route with param and a * wildcard', function (done) {
      const app = express()

      const oapi = openapi()
      app.use(oapi)
      app.get('/route/:param/desc/*', oapi.path({
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
          assert.strictEqual(Object.keys((res.body.paths))[0], '/route/{param}/desc/{0}')
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters.length, 2)
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters[0].name, 'param')
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters[1].name, 0)
          done()
        })
    })

    test('serve routes with only a * wildcard', function (done) {
      const app = express()

      const oapi = openapi()
      app.use(oapi)
      app.get('/*', oapi.path({
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
          assert.strictEqual(Object.keys((res.body.paths))[0], '/{0}')
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters.length, 1)
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters[0].name, 0)
          done()
        })
    })

    test('serve routes with a * wildcard parameter and a named parameter', function (done) {
      const app = express()

      const oapi = openapi()
      app.use(oapi)
      app.get('/route/*/:param', oapi.path({
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
          assert.strictEqual(Object.keys((res.body.paths))[0], '/route/{0}/{param}')
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters.length, 2)
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters[0].name, 0)
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters[1].name, 'param')
          done()
        })
    })

    test('serve routes with two parameters and a hardcoded desc then a wildcard parameter', function (done) {
      const app = express()

      const oapi = openapi()
      app.use(oapi)
      app.get('/route/:paramA/:paramB/desc/*', oapi.path({
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
          assert.strictEqual(Object.keys((res.body.paths))[0], '/route/{paramA}/{paramB}/desc/{0}')
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters.length, 3)
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters[0].name, 'paramA')
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters[1].name, 'paramB')
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters[2].name, 0)
          done()
        })
    })

    test('serve routes with two parameters and a wildcard parameter', function (done) {
      const app = express()

      const oapi = openapi()
      app.use(oapi)
      app.get('/route/:paramA/:paramB/*', oapi.path({
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
          assert.strictEqual(Object.keys((res.body.paths))[0], '/route/{paramA}/{paramB}/{0}')
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters.length, 3)
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters[0].name, 'paramA')
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters[1].name, 'paramB')
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters[2].name, 0)
          done()
        })
    })

    test('serve routes with a parameter and another named, grouped, wildcard parameter', function (done) {
      const app = express()

      const oapi = openapi()
      app.use(oapi)
      app.get('/route/:paramA/:paramB(*)', oapi.path({
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
          assert.strictEqual(Object.keys((res.body.paths))[0], '/route/{paramA}/{paramB}')
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters.length, 2)
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters[0].name, 'paramA')
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters[1].name, 'paramB')
          done()
        })
    })

    test('serve multiple routes with a parameter and another named, grouped, wildcard parameter', function (done) {
      const app = express()

      const oapi = openapi()
      app.use(oapi)
      app.get(['/route/:paramA/:paramB(*)', '/cars/:paramA/:paramB(*)'], oapi.path({
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
          assert.strictEqual(Object.keys((res.body.paths))[0], '/route/{paramA}/{paramB}')
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters.length, 4)
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters[0].name, 'paramA')
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters[1].name, 'paramB')
          done()
        })
    })

    test('serve routes with a parameter and another named wildcard parameter', function (done) {
      const app = express()

      const oapi = openapi()
      app.use(oapi)
      app.get('/route/:paramA/:paramB*', oapi.path({
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
          assert.strictEqual(Object.keys((res.body.paths))[0], '/route/{paramA}/{paramB}')
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters.length, 3)
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters[0].name, 'paramA')
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters[1].name, 'paramB')
          done()
        })
    })

    test('serve routes with a parameter and a * wildcard', function (done) {
      const app = express()

      const oapi = openapi()
      app.use(oapi)
      app.get('/route/:param/*', oapi.path({
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
          assert.strictEqual(Object.keys((res.body.paths))[0], '/route/{param}/{0}')
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters.length, 2)
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters[1].name, 0)
          assert.strictEqual(res.body.paths[Object.keys((res.body.paths))[0]].get.parameters[0].name, 'param')
          done()
        })
    })
  })
}
