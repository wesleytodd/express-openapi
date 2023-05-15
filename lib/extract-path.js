const url = require('url')

module.exports = function extractPath (input) {
  if (input.startsWith('/')) {
    return input
  }

  const parsedUrl = url.parse(input)
  return parsedUrl.path
}
