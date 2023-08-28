'use strict'
const path = require('path')
const serve = require('serve-static')

function requireResolveUI (name) {
  let uiPath
  try {
    uiPath = require.resolve(name)
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      throw Object.assign(e, {
        message: `${name} is an optional dependency. Install it to use it. (${e.message})`
      })
    }
    throw e
  }
  return uiPath
}

module.exports.serveRedoc = function serveRedoc (documentUrl) {
  const redocPath = requireResolveUI('redoc')
  return [serve(path.resolve(redocPath, '..')), function renderRedocHtml (req, res) {
    res.type('html').send(renderHtmlPage('ReDoc', `
      <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    `, `
      <redoc spec-url="${documentUrl}"></redoc>
      <script src="./redoc.standalone.js"></script>
    `))
  }]
}

module.exports.serveSwaggerUI = function serveSwaggerUI (documentUrl) {
  const swaggerPath = requireResolveUI('swagger-ui-dist')
  return [serve(path.resolve(swaggerPath, '..'), { index: false }), function renderSwaggerHtml (req, res) {
    res.type('html').send(renderHtmlPage('Swagger UI', `
      <link rel="stylesheet" type="text/css" href="./swagger-ui.css" >
    `, `
      <div id="swagger-ui"></div>
      <script src="./swagger-ui-bundle.js"></script>
      <script src="./swagger-ui-standalone-preset.js"></script>
      <script>
        window.onload = function () {
          window.ui = SwaggerUIBundle({
            url: "${documentUrl}",
            dom_id: '#swagger-ui'
          })
        }
      </script>
    `))
  }]
}

function renderHtmlPage (title, head, body) {
  return `<!DOCTYPE html>
<html>
  <head>
    <title>${title}</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      html {
          box-sizing: border-box;
          overflow: -moz-scrollbars-vertical;
          overflow-y: scroll;
      }
      *,
      *:before,
      *:after {
          box-sizing: inherit;
      }
      body {
        margin: 0;
        padding: 0;
        background: #fafafa;
      }
    </style>
    ${head}
  </head>
  <body>
    ${body}
  </body>
</html>
  `
}
