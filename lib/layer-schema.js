'use strict'
const schemas = new Map()

module.exports = {
  set: (handler, schema) => {
    schemas.set(handler, schema)
  },
  get: (handler) => {
    return schemas.get(handler)
  }
}
