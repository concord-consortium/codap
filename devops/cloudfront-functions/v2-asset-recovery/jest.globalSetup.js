'use strict'

// Jest globalSetup -- runs build-function.sh so dist/v2-asset-recovery.js is freshly built
// before the dual-target suite runs every assertion against the deployed artifact. Mirrors
// v2-v3-redirect's jest.globalSetup.js.
const { execFileSync } = require('child_process')
const path = require('path')

module.exports = function globalSetup() {
  execFileSync('bash', [path.join(__dirname, 'build-function.sh')], { stdio: 'inherit', cwd: __dirname })
}
