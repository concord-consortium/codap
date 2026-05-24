'use strict'

const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { JSDOM } = require('jsdom')

// SE-J3 -- both the committed source and the built artifact are valid load targets; the
// suite (in v2-v3-redirect.test.js) runs every assertion against each. Default target is
// the committed source.
const COMMITTED_SOURCE = 'v2-v3-redirect.js'
const BUILT_ARTIFACT = 'dist/v2-v3-redirect.js'
const readSource = (file) => fs.readFileSync(path.join(__dirname, file), 'utf8')

// Load the function into a fresh VM context and return its `handler`. The function file is
// never modified for testability -- it has no module.exports; we eval it and read `handler`.
function loadHandler(file = COMMITTED_SOURCE) {
  const sandbox = { console: { log() {} } }
  vm.createContext(sandbox)
  vm.runInContext(readSource(file) + '\n;this.handler = handler;', sandbox)
  return sandbox.handler
}

// Build a CloudFront Functions viewer-request event.
function makeEvent(uri, opts) {
  const o = opts || {}
  const method = o.method || 'GET'
  const querystring = o.querystring || ''
  const qs = {}
  if (querystring) {
    const pairs = querystring.split('&')
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i]
      const eq = pair.indexOf('=')
      const name = eq < 0 ? pair : pair.slice(0, eq)
      const value = eq < 0 ? '' : pair.slice(eq + 1)
      if (qs[name]) {
        qs[name].multiValue = qs[name].multiValue || [{ value: qs[name].value }]
        qs[name].multiValue.push({ value })
      } else {
        qs[name] = { value }
      }
    }
  }
  return { request: { method, uri, querystring: qs, headers: {} } }
}

// Extract the inline <script> from a synthetic response body and run it under jsdom with
// the given location.search / location.hash. Returns the URL passed to
// window.location.replace().
function runClientScript(body, opts) {
  const o = opts || {}
  const search = o.search || ''
  const hash = o.hash || ''
  const script = body.match(/<script>([\s\S]*?)<\/script>/)[1]
  const dom = new JSDOM('<!DOCTYPE html>', { url: 'https://codap.concord.org/x' })
  let replaced = null
  dom.window.location.replace = (url) => { replaced = url }
  Object.defineProperty(dom.window.location, 'search', { value: search, configurable: true })
  Object.defineProperty(dom.window.location, 'hash', { value: hash, configurable: true })
  dom.window.eval(script)
  return replaced
}

// SE-J1 -- load the function (committed source or built artifact, SE-J3) with LOG_ENABLED
// forced true and capture every console.log line, exercising reconstructQuery / logSafe /
// logDestination, the per-match log line, and the catch-block error-fallthrough line. The
// toggle is matched with a regex so it also matches the built artifact, where terser's
// default output drops the spaces around `=`. `sandbox` is returned so a test can override
// a context global -- e.g. replace `buildResponse` with a throwing stub to drive the catch
// path while request.uri stays a normal string.
function loadHandlerCapturingLogs(file = COMMITTED_SOURCE) {
  const logs = []
  const sandbox = { console: { log: (line) => logs.push(String(line)) } }
  vm.createContext(sandbox)
  const raw = readSource(file)
  const src = raw.replace(/var LOG_ENABLED\s*=\s*false/, 'var LOG_ENABLED = true')
  if (src === raw) { throw new Error('LOG_ENABLED toggle not found in ' + file) }
  vm.runInContext(src + '\n;this.handler = handler;', sandbox)
  return { handler: sandbox.handler, logs, sandbox }
}

module.exports = {
  loadHandler,
  loadHandlerCapturingLogs,
  makeEvent,
  runClientScript,
  COMMITTED_SOURCE,
  BUILT_ARTIFACT
}
