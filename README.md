# Express OpenAPI

A middleware for generating OpenAPI documentation from an Express app.

This middleware will look at the routes defined in your app and fill in as much as it can about them
into an OpenAPI document.  Optionally you can also flesh out request and response schemas, parameters, and
other parts of your api spec with path specific middleware.  The final document will be exposed as json
served by the main middleware.

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

// This will serve the generated json document
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

```
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
