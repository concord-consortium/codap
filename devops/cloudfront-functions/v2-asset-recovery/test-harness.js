'use strict'

const fs = require('fs')
const path = require('path')
const vm = require('vm')

// Both the committed source and the built artifact are valid load targets; the suite runs
// every assertion against each (mirrors v2-v3-redirect's SE-J3 dual-target approach).
const COMMITTED_SOURCE = 'v2-asset-recovery.js'
const BUILT_ARTIFACT = 'dist/v2-asset-recovery.js'
const readSource = (file) => fs.readFileSync(path.join(__dirname, file), 'utf8')

// Load the function into a fresh VM context and return its `handler`. The function file has
// no module.exports; we eval it and read `handler` (the file is never modified for testability).
function loadHandler(file = COMMITTED_SOURCE) {
  const sandbox = {}
  vm.createContext(sandbox)
  vm.runInContext(readSource(file) + '\n;this.handler = handler;', sandbox)
  return sandbox.handler
}

// Build a CloudFront Functions viewer-request event with the given uri.
function makeEvent(uri, opts) {
  const o = opts || {}
  return {
    request: {
      method: o.method || 'GET',
      uri,
      querystring: {},
      headers: { host: { value: 'codap.concord.org' } }
    }
  }
}

module.exports = { loadHandler, makeEvent, COMMITTED_SOURCE, BUILT_ARTIFACT }
