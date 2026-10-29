'use strict'

const Router = require('router')

function isRouter (handle) {
  return Boolean(handle) && Array.isArray(handle.stack)
}

function usePath (args) {
  let arg = args[0]
  while (Array.isArray(arg) && arg.length !== 0) {
    arg = arg[0]
  }
  return typeof arg === 'function' ? '/' : args[0]
}

if (typeof Router.prototype.listRoutes !== 'function') {
  const use = Router.prototype.use
  Router.prototype.use = function (...args) {
    const start = this.stack.length
    const result = use.apply(this, args)
    const path = usePath(args)
    this.stack.slice(start).forEach((layer) => {
      layer.rawPath = Array.isArray(path) ? path.flat(Infinity) : path
    })
    return result
  }
}

function layerPaths (layer) {
  return [layer.route ? layer.route.path : layer.rawPath].flat(Infinity)
}

module.exports = function listRoutes (router) {
  const layers = router.stack.filter((layer) => layer.route || isRouter(layer.handle))
  const routes = layers.flatMap((layer) => layerPaths(layer).map(() => layer.route))
  const entries = typeof router.listRoutes === 'function'
    ? router.listRoutes()
    : layers.flatMap((layer) => layerPaths(layer).map((path) => ({
      path,
      router: layer.route ? undefined : layer.handle
    })))

  return entries.map((entry, i) => ({ ...entry, route: routes[i] }))
}
