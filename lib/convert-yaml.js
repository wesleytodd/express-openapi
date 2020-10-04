const YAML = require('yaml')

/**
 * Converts a json to yaml
 * @param {object} jsonObject
 * @returns {string} yamlString
 */
module.exports = function (jsonObject) {
  const doc = YAML.stringify(jsonObject)
  return doc
}
