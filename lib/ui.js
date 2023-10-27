'use strict'
const path = require('path')
const serve = require('serve-static')

module.exports.serveRedoc = function serveRedoc (documentUrl) {
  return [serve(path.resolve(require.resolve('redoc'), '..')), function renderRedocHtml (req, res) {
    res.type('html').send(renderHtmlPage('ReDoc', `
      <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    `, `
      <redoc spec-url="${documentUrl}"></redoc>
      <script src="./redoc.standalone.js"></script>
    `))
  }]
}

module.exports.serveSwaggerUI = function serveSwaggerUI (documentUrl) {
  return [serve(path.resolve(require.resolve('swagger-ui-dist'), '..'), { index: false }), function renderSwaggerHtml (req, res) {
    const scriptContent = `
      window.onload = function () {
        window.ui = SwaggerUIBundle({
          url: "${documentUrl}",
          dom_id: '#swagger-ui'
        })
      }
    `
    const alg = 'sha256'
    const hash = require('crypto').createHash(alg).update(scriptContent, 'utf8').digest('base64')
    res
      .type('html')
      .header('Content-Security-Policy', `script-src 'self' '${alg}-${hash}'`)
      .send(renderHtmlPage('Swagger UI', `
        <link rel="stylesheet" type="text/css" href="./swagger-ui.css" >
      `, `
        <div id="swagger-ui"></div>
        <script src="./swagger-ui-bundle.js"></script>
        <script src="./swagger-ui-standalone-preset.js"></script>
        <script>${scriptContent}</script>
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
