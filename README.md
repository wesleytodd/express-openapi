# Express OpenAPI

[![NPM Version](https://badgen.net/npm/v/@wesleytodd/openapi)](https://npmjs.org/package/@wesleytodd/openapi)
[![NPM Downloads](https://badgen.net/npm/dm/@wesleytodd/openapi)](https://npmjs.org/package/@wesleytodd/openapi)
[![js-standard-style](https://badgen.net/badge/style/standard/green)](https://github.com/standard/standard)

A middleware for generating and validating OpenAPI documentation from an Express app.

This middleware will look at the routes defined in your app and fill in as much as it can about them
into an OpenAPI document.  Optionally you can also flesh out request and response schemas, parameters, and
other parts of your api spec with path specific middleware.  The final document will be exposed as json
served by the main middleware (along with component specific documents).

## Philosophy

It is common in the OpenAPI community to talk about generating code from documentation. There is value
in this approach, as often it is easier for devs to let someone else make the implementation decisions
for them.  For me, I feel the opposite.  I am an engineer whose job it is to make good decisions about
writing quality code. I want control of my application, and I want to write code. With this module I can
both write great code, as well as have great documentation!


## Installation

```
$ npm install --save @wesleytodd/openapi
```

## Usage

```javascript
const openapi = require('@wesleytodd/openapi')
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
// (as well as the swagger-ui if configured)
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
  - `options.coerce`: Enable data type [`coercion`](https://www.npmjs.com/package/ajv#coercing-data-types)
  - `options.htmlui`: Turn on serving `swagger-ui` html ui
  - `options.basePath`: When set, will strip the value of `basePath` from the start of every path.

##### Coerce

By default `coerceTypes` is set to `true` for AJV, but a copy of the `req` data
is passed to prevent modifying the `req` in an unexpected way.  This is because
the `coerceTypes` option in (AJV modifies the input)[https://github.com/epoberezkin/ajv/issues/549].
If this is the behavior you want, you can pass `true` for this and a copy will not be made.
This will result in params in the path or query with type `number` will be converted
to numbers [based on the rules from AJV](https://github.com/epoberezkin/ajv/blob/master/COERCION.md).

### `OpenApiMiddleware.path([definition])`

Registers a path with the OpenAPI document.  The path `definition` is an
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

### `OpenApiMiddleware.validPath([definition [, pathOpts]])`

Registers a path with the OpenAPI document, also ensures incoming requests are valid against the schema.  The path
`definition` is an [`OperationObject`](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#operationObject)
with all of the information about the requests and responses on that route. It returns a middleware function which
can be used in an express app and will call `next(err) if the incoming request is invalid.

The error is created with (`http-errors`)[https://www.npmjs.com/package/http-errors], and then is augmented with
information about the schema and validation errors.  Validation uses (`avj`)[https://www.npmjs.com/package/ajv],
and `err.validationErrors` is the format exposed by that package. Pass { keywords: [] } as pathOpts to support custom validation based on [ajv-keywords](https://www.npmjs.com/package/ajv-keywords).

**Example:**

```javascript
app.get('/:foo', oapi.validPath({
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

app.get('/zoom', oapi.validPath({
  ...
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
  ...
}, { keywords: ['regexp'] }), (err, req, res, next) => {
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
[OpenAPI spec](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#fixed-fields-6).
Each of which is just the `component` method with a bound type, and behave with the same variadic behavior.

### `OpenApiMiddleware.swaggerui()`

Serve an interactive UI for exploring the OpenAPI document.

[SwaggerUI](https://www.npmjs.com/package/swagger-ui) is one of the most popular tools for viewing OpenAPI documents and are bundled with the middleware.
The UI is not turned on by default but can be with the option mentioned above or by using one
of these middleware. Both interactive UIs also accept an optional object as a function argument which accepts configuration parameters for Swagger and Redoc. The full list of Swagger and Redoc configuration options can be found here: https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/ and here: https://redocly.com/docs/redoc/config/ respectively.

**Example:**

```javascript
app.use('/swaggerui', oapi.swaggerui())
```
