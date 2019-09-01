# Express OpenAPI

[![NPM Version](https://badgen.net/npm/v/@wesleytodd/openapi)](https://npmjs.org/package/@wesleytodd/openapi)
[![NPM Downloads](https://badgen.net/npm/dm/@wesleytodd/openapi)](https://npmjs.org/package/@wesleytodd/openapi)
[![js-standard-style](https://badgen.net/badge/style/standard/green)](https://github.com/standard/standard)

A middleware for generating and validating OpenAPI documentation from an Express app.

This middleware will look at the routes defined in your app and fill in as much as it can about them
into an OpenAPI document.  Optionally you can also flesh out request and response schemas, parameters, and
other parts of your api spec with path specific middleware.  The final document will be exposed as json
served by the main middleware (along with component specific documents).

## Note on package name

This pacakge document's itself as `@express/openapi`. This is because we (the Express TC) have been discussng
adopting the npm scope for publishing "core maintained" middleware modules.  This is one such middleware.
While we are working out the details of this I am publishing this moudle under my personal scope.  When
that is resolved we will move it over to the main scope and I will deprecate this module.

Install & usage step for now: `$ npm in @wesleytodd/openapi` & `const openapi = require('@wesleytodd/openapi')`

## Philosophy

It is common in the OpenAPI community to talk about generating code from documentation. There is value
in this approach, as often it is easier for devs to let someone else make the implementation decisions
for them.  For me, I feel the opposite.  I am an engineer who's job it is to make good desicions about
writing quality code. I want control of my application, and I want to write code. With this module I can
both write great code, as well as have great documentation!


## Installation

```
$ npm install --save @express/openapi
```

## Usage

```javascript
const openapi = require('@express/openapi')
const app = require('express')()

const oapi = openapi({
  openapi: '3.0.0',
  info: {
    title: 'Express Application',
    description: 'Generated docs from an Express api',
    version: '1.0.0',
  }
})

// This will serve the generated json document(s)
// (as well as swatter-ui or redoc if configured)
app.use(oapi)

// To add path specific schema you can use the .path middleware
app.get('/', oapi.path({
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
}), (req, res) => {
  res.json({
    hello: 'world'
  })
})

app.listen(8080)
```

In the above example you can see the output of the OpenAPI spec by requesting `/openapi.json`.

```shell
$ curl -s http://localhost:8080/openapi.json | jq .
{
  "openapi": "3.0.0",
  "info": {
    "title": "Express Application",
    "version": "1.0.0",
    "description": "Generated docs from an Express api"
  },
  "paths": {
    "/": {
      "get": {
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "hello": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## Api Docs

### `openapi([route [, document[, options]]])`

Creates an instance of the documentation middleware.  The function that is returned
is a middleware function decorated with helper methods for setting up the api documentation.

Options:

- `route <string>`: A route for which the documentation will be served at
- `document <object>`: Base document on top of which the paths will be added
- `options <object>`: Options object
  - `options.htmlui`: Turn on serving `redoc` or `swagger-ui` html ui

### `OpenApiMiddleware.path([definition])`

Registers a path with the OpenApi document.  The path `definition` is an
[`OperationObject`](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#operationObject)
with all of the information about the requests and responses on that route. It returns
a middleware function which can be used in an express app.

**Example:**

```javascript
app.get('/:foo', oapi.path({
  description: 'Get a foo',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              foo: { type: 'string' }
            }
          }
        }
      }
    }
  }
}), (req, res) => {
  res.json({
    foo: req.params.foo
  })
})
```

### `OpenApiMiddleware.validPath([definition])`

Registers a path with the OpenApi document, also ensures incoming requests are valid against the schema.  The path
`definition` is an [`OperationObject`](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#operationObject)
with all of the information about the requests and responses on that route. It returns a middleware function which
can be used in an express app and will call `next(err) if the incoming request is invalid.

The error is created with (`http-errors`)[https://www.npmjs.com/package/http-errors], and then is augmented with
information about the schema and validation errors.  Validation uses (`avj`)[https://www.npmjs.com/package/ajv],
and `err.validationErrors` is the format exposed by that package.

**Example:**

```javascript
app.get('/:foo', oapi.path({
  description: 'Get a foo',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              foo: { type: 'string' }
            }
          }
        }
      }
    },
    400: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          }
        }
      }
    }
  }
}), (err, req, res, next) => {
  res.status(err.status).json({
    error: err.message,
    validation: err.validationErrors,
    schema: err.validationSchema
  })
})
```

### `OpenApiMiddleware.component(type[, name[, definition]])`

Defines a new [`Component`](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#components-object)
on the document.

**Example:**

```javascript
oapi.component('examples', 'FooExample', {
  summary: 'An example of foo',
  value: 'bar'
})
```

If neither `definition` nor `name` are passed, the function will return the full `components` json.

**Example:**

```javascript
oapi.component('examples', FooExample)
// { '$ref': '#/components/examples/FooExample' }
```

If `name` is defined but `definition` is not, it will return a
[`Reference Object`](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#referenceObject)
pointing to the component by that name.

**Example:**

```javascript
oapi.component('examples')
// { summary: 'An example of foo', value: 'bar' }
```

#### `OpenApiMiddleware.schema(name[, definition])`
#### `OpenApiMiddleware.response(name[, definition])`
#### `OpenApiMiddleware.parameters(name[, definition])`
#### `OpenApiMiddleware.examples(name[, definition])`
#### `OpenApiMiddleware.requestBodies(name[, definition])`
#### `OpenApiMiddleware.headers(name[, definition])`
#### `OpenApiMiddleware.securitySchemes(name[, definition])`
#### `OpenApiMiddleware.links(name[, definition])`
#### `OpenApiMiddleware.callbacks(name[, definition])`

There are special component middleware for all of the types of component defined in the
[OpenApi spec](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#fixed-fields-6).
Each of which is just the `component` method with a bound type, and behave with the same variadic behavior.

### `OpenApiMiddleware.redoc()`
### `OpenApiMiddleware.swaggerui()`

Serve an interactive UI for exploring the OpenApi document.

[Redoc](https://github.com/Rebilly/ReDoc/) and [SwaggerUI](https://www.npmjs.com/package/swagger-ui) are
two of the most popular tools for viewing OpenApi documents and are bundled with the middleware.
They are not turned on by default but can be with the option mentioned above or by using one
of these middleware.

**Example:**

```javascript
app.use('/redoc', oapi.redoc())
app.use('/swaggerui', oapi.redoc())
```
