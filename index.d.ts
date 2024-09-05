import type { IRouter, Request, RequestHandler as Middleware, Response, NextFunction } from "express";
import type { OpenAPIV3 } from "openapi-types";
import type { SwaggerUIOptions } from "swagger-ui";

type Options = {
  basePath?: string;
  htmlui?: "swagger-ui";
  coerce?: "true" | "false";
};

interface OpenApiMiddleware extends Middleware {
  document: OpenAPIV3.Document;
  options: Options;
  routePrefix: string;
  generateDocument: (doc: OpenAPIV3.Document, router?: IRouter, basePath?: string) => OpenAPIV3.Document;
  /**
   * Registers a path with the OpenAPI document.
   * The path `definition` is an {@link https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#operationObject OperationObject}
   * with all of the information about the requests and responses on that route.
   *
   * It returns a middleware function which can be used in an express app.
   *
   * @example
   *
   * ```ts
   * app.get('/:foo', oapi.path({
   *   description: 'Get a foo',
   *   responses: {
   *     200: {
   *       content: {
   *         'application/json': {
   *           schema: {
   *             type: 'object',
   *             properties: {
   *               foo: { type: 'string' }
   *             }
   *           }
   *         }
   *       }
   *     }
   *   }
   * }), (req, res) => {
   *  res.json({
   *    foo: req.params.foo
   *  })
   * })
   * ```
   */
  path: (schema?: OpenAPIV3.OperationObject) => Middleware;
  /**
   * Registers a path with the OpenAPI document, also ensures incoming requests are valid against the schema.
   * The path `definition` is an {@link https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#operationObject OperationObject}
   * with all of the information about the requests and responses on that route.
   *
   * It returns a middleware function which can be used in an express app and will call `next(err)` if the incoming request is invalid.
   * The error is created with ({@link https://www.npmjs.com/package/http-errors http-errors}), and then is augmented with information about the schema and validation errors.
   * Validation uses ({@link https://www.npmjs.com/package/ajv ajv}), and `err.validationErrors` is the format exposed by that package.
   *
   * Pass `{ keywords: [] }` as `pathOpts` to support custom validation based on ajv-keywords.
   *
   * @example
   * ```js
   * app.get('/:foo', oapi.validPath({
   *   description: 'Get a foo',
   *   responses: {
   *     200: {
   *       content: {
   *         'application/json': {
   *           schema: {
   *             type: 'object',
   *             properties: {
   *               foo: { type: 'string' }
   *             }
   *           }
   *         }
   *       }
   *     },
   *     400: {
   *       content: {
   *         'application/json': {
   *           schema: {
   *             type: 'object',
   *             properties: {
   *               error: { type: 'string' }
   *             }
   *           }
   *         }
   *       }
   *     }
   *   }
   * }), (err, req, res, next) => {
   *   res.status(err.status).json({
   *     error: err.message,
   *     validation: err.validationErrors,
   *     schema: err.validationSchema
   *   })
   * })
   *
   * app.get('/zoom', oapi.validPath({
   *   ...
   *   requestBody: {
   *     required: true,
   *     content: {
   *       'application/json': {
   *         schema: {
   *           type: 'object',
   *           properties: {
   *             name: { type: 'string', not: { regexp: '/^[A-Z]/' } }
   *           }
   *         }
   *       }
   *     }
   *   },
   *   ...
   * }, { keywords: ['regexp'] }), (err, req, res, next) => {
   *   res.status(err.status).json({
   *     error: err.message,
   *     validation: err.validationErrors,
   *     schema: err.validationSchema
   *   })
   * })
   * ```
   */
  validPath: (schema?: OpenAPIV3.OperationObject, pathOpts?: { strict?: boolan; keywords?: string | string[] }) => Middleware;
  /**
   * Defines a new {@link https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#components-object Component} on the document.
   *
   * @example
   * ```js
   * oapi.component('examples', 'FooExample', {
   *   summary: 'An example of foo',
   *   value: 'bar'
   * })
   * ```
   *
   * If `name` is defined but `definition` is not, it will return a {@link https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#referenceObject Reference Object} pointing to the component by that name.
   *
   * @example
   * ```js
   * oapi.component('examples', 'FooExample')
   * // { '$ref': '#/components/examples/FooExample' }
   * ```
   *
   * If neither `definition` nor `name` are passed, the function will return the full `components` json.
   *
   * @example
   * ```js
   * oapi.component('examples')
   * // { summary: 'An example of foo', value: 'bar' }
   * ```
   */
  component: {
    <Type extends keyof Component>(type: Type): OpenAPIV3.ComponentsObject[Type];
    <Type extends keyof Component>(type: Type, name: string): OpenAPIV3.ReferenceObject;
    <Type extends keyof Component>(type: Type, name: string, definition: Component[Type]): OpenApiMiddleware;
  };
  schema: {
    (name: string): OpenAPIV3.ReferenceObject;
    (name: string, definition: OpenAPIV3.SchemaObject): OpenApiMiddleware;
  };
  response: {
    (name: string): OpenAPIV3.ReferenceObject;
    (name: string, definition: OpenAPIV3.ResponseObject): OpenApiMiddleware;
  };
  parameters: {
    (name: string): OpenAPIV3.ReferenceObject;
    (name: string, definition: OpenAPIV3.ParameterObject): OpenApiMiddleware;
  };
  examples: {
    (name: string): OpenAPIV3.ReferenceObject;
    (name: string, definition: OpenAPIV3.ExampleObject): OpenApiMiddleware;
  };
  requestBodies: {
    (name: string): OpenAPIV3.ReferenceObject;
    (name: string, definition: OpenAPIV3.RequestBodyObject): OpenApiMiddleware;
  };
  headers: {
    (name: string): OpenAPIV3.ReferenceObject;
    (name: string, definition: OpenAPIV3.HeaderObject): OpenApiMiddleware;
  };
  securitySchemes: {
    (name: string): OpenAPIV3.ReferenceObject;
    (name: string, definition: OpenAPIV3.SecuritySchemeObject): OpenApiMiddleware;
  };
  links: {
    (name: string): OpenAPIV3.ReferenceObject;
    (name: string, definition: OpenAPIV3.LinkObject): OpenApiMiddleware;
  };
  callbacks: {
    (name: string): OpenAPIV3.ReferenceObject;
    (name: string, definition: OpenAPIV3.CallbackObject): OpenApiMiddleware;
  };
  /**
   * Serve an interactive UI for exploring the OpenAPI document.
   *
   * {@link https://www.npmjs.com/package/swagger-ui SwaggerUI} is one of the most popular tools for viewing OpenAPI documents and are bundled with the middleware.
   * The UI is not turned on by default but can be with the option mentioned above or by using one of these middleware.
   * Both interactive UIs also accept an optional object as a function argument which accepts configuration parameters for Swagger and Redoc.
   * The full list of Swagger and Redoc configuration options can be found {@link https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/ here} 
   * and {@link https://redocly.com/docs/redoc/config/ here} respectively.
   *
   * @example
   * ```js
   * app.use('/swaggerui', oapi.swaggerui())
   * ```
   */
  swaggerui: (options?: SwaggerUIOptions) => Middleware[];
}

/** 
 * Utility type helper to return value types from the given Record type `T`.
 */
type ObjectValue<T extends Record<string, unknown>> = T extends { [key: string]: infer V } ? V : never;

/**
 * Utility type helper to compose a map of `OpenAPIV3.ComponentsObject`.
 *
 * This map type is used to determine what type we are allowed to input or
 * expected to return from the {@link OpenApiMiddleware.component} function.
 */
type Component = {
  [K in keyof OpenAPIV3.ComponentsObject]-?: ObjectValue<OpenAPIV3.ComponentsObject[K]>;
};

/**
 * Creates an instance of the documentation middleware.
 * The function that is returned is a middleware function decorated with helper methods for setting up the api documentation.
 *
 * @param route - A route for which the documentation will be served at
 * @param doc - Base document on top of which the paths will be added
 * @param options - Options
 * @param options.coerce - Enable data type {@link https://www.npmjs.com/package/ajv#coercing-data-types coercion}
 * @param options.htmlui - Turn on serving `swagger-ui` html ui
 * @param options.basePath - When set, will strip the value of `basePath` from the start of every path
 *
 * Coerce 
 *
 * By default `coerceTypes` is set to `true` for `ajv`, but a copy of the `req` data is passed to prevent modifying the `req` in an unexpected way.
 * This is because the `coerceTypes` option in ({@link https://github.com/ajv-validator/ajv/issues/549 `ajv` modifies the input}).
 * If this is the behavior you want, you can pass `true` for this and a copy will not be made.
 * This will result in params in the path or query with type `number` will be converted to numbers {@link https://github.com/epoberezkin/ajv/blob/master/COERCION.md based on the rules from `ajv`}.
 */
function openapi(): OpenApiMiddleware;
function openapi(doc: OpenAPIV3.Document, opts?: Options): OpenApiMiddleware;
function openapi(route: string, doc?: OpenAPIV3.Document, opts?: Options): OpenApiMiddleware;

namespace openapi {
  const minimumViableDocument: OpenAPIV3.Document;
  const defaultRoutePrefix: "/openapi";
}

export = openapi;
