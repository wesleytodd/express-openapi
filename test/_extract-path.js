const assert = require('assert')
const { suite, test } = require('mocha')
const extractPath = require('../lib/extract-path')

suite('extractPath', function () {
  test('should correctly extract path from a URL', function () {
    const result = extractPath('https://api.example.com:8443/v1/reports')
    assert.strictEqual(result, '/v1/reports')
  })

  test('should return the input when it is already a path', function () {
    const result = extractPath('/v1/path')
    assert.strictEqual(result, '/v1/path')
  })

  test('should return an empty string when the URL has no path', function () {
    const result = extractPath('https://api.example.com')
    assert.strictEqual(result, '/')
  })

  test('should handle URLs with query parameters', function () {
    const result = extractPath('https://api.example.com/v1/reports?id=123')
    assert.strictEqual(result, '/v1/reports?id=123')
  })
})
