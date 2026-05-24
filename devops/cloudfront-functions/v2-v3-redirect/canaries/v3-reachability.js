// CloudWatch Synthetics canary -- "is V3 reachable" (R26b).
// HTTPS GET https://<target host>/app/ and assert the body contains the V3 marker
// `codap-app-id`. Target host is set by the CANARY_TARGET_HOST environment variable on
// the canary (pre-flip = codap2to3.concord.org, post-flip = codap.concord.org; DO-F2).
//
// Runs on the Synthetics nodejs-puppeteer runtime; the global `synthetics` API is
// provided by AWS.

const https = require('https')
const synthetics = require('Synthetics')      // eslint-disable-line node/no-missing-require
const log = require('SyntheticsLogger')       // eslint-disable-line node/no-missing-require

const TARGET_HOST = process.env.CANARY_TARGET_HOST || 'codap2to3.concord.org'
const V3_MARKER = 'codap-app-id'

exports.handler = async () => {
  return await synthetics.executeStep('v3-reachability', async () => {
    const body = await fetchBody('https://' + TARGET_HOST + '/app/')
    log.info('GET /app/ returned ' + body.length + ' bytes')
    if (body.indexOf(V3_MARKER) < 0) {
      throw new Error('V3 marker "' + V3_MARKER + '" not found in /app/ response body')
    }
  })
}

function fetchBody(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error('HTTP ' + res.statusCode + ' from ' + url))
        res.resume()
        return
      }
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    }).on('error', reject)
  })
}
