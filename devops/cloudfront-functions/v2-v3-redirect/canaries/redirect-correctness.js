// CloudWatch Synthetics canary -- "does the redirect still fire" (R26b).
// HTTPS GET an English V2 path that the function should intercept with a synthetic
// response, then assert the body contains the stable marker `<!-- codap-redirect -->`.
// CANARY_TARGET_HOST is pre-flip codap2to3.concord.org, post-flip codap.concord.org
// (DO-F2; re-pointed by flip.sh post-flip step).

const https = require('https')
const synthetics = require('Synthetics')      // eslint-disable-line node/no-missing-require
const log = require('SyntheticsLogger')       // eslint-disable-line node/no-missing-require

const TARGET_HOST = process.env.CANARY_TARGET_HOST || 'codap2to3.concord.org'
const REDIRECT_MARKER = '<!-- codap-redirect -->'
const PROBE_PATH = '/app/static/dg/en/cert/index.html'

exports.handler = async () => {
  return await synthetics.executeStep('redirect-correctness', async () => {
    const body = await fetchBody('https://' + TARGET_HOST + PROBE_PATH)
    log.info('GET ' + PROBE_PATH + ' returned ' + body.length + ' bytes')
    if (body.indexOf(REDIRECT_MARKER) < 0) {
      throw new Error('redirect marker "' + REDIRECT_MARKER + '" not found in ' + PROBE_PATH +
        ' response body -- the function did not fire (logic bug, attachment drift, or origin' +
        ' served the request unintercepted)')
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
