'use strict'

// Jest globalSetup (RR-J1) -- runs build-function.sh so dist/v2-v3-redirect.js is freshly
// built before the SE-J3 dual-target suite runs the whole matrix against the deployed
// artifact. Fires once per `jest` invocation regardless of how Jest is started
// (`npm test`, `npx jest`, watch, IDE).
//
// In watch mode the artifact target reflects the build from the run's start, not per-edit
// -- acceptable, since the watch-edit feedback the developer cares about is the committed
// source.

const { execFileSync } = require('child_process')
const path = require('path')

module.exports = function globalSetup() {
  const script = path.join(__dirname, 'build-function.sh')
  execFileSync('bash', [script], { stdio: 'inherit', cwd: __dirname })
}
