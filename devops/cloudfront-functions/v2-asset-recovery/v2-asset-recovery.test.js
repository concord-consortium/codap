'use strict'

const { loadHandler, makeEvent, COMMITTED_SOURCE, BUILT_ARTIFACT } = require('./test-harness')

const BUILD = '/releases/build_0745'

// The entire suite runs against BOTH the committed source and the built artifact
// dist/v2-asset-recovery.js (Jest globalSetup builds dist/ at the start of every run).
describe.each([
  ['committed source', COMMITTED_SOURCE],
  ['deployed artifact', BUILT_ARTIFACT]
])('v2-asset-recovery.js (%s)', (label, sourceFile) => {
  const handler = loadHandler(sourceFile)
  const rewritten = (uri) => handler(makeEvent(uri)).uri

  describe('rewrites /app-rooted V2 asset paths onto the pinned build', () => {
    test.each([
      ['/app/static/dg/en/cert/index.html',          BUILD + '/static/dg/en/cert/index.html'],
      ['/app/static/dg/en/cert/javascript-packed.js', BUILD + '/static/dg/en/cert/javascript-packed.js'],
      ['/app/static/dg/fr/cert/javascript-packed.js', BUILD + '/static/dg/fr/cert/javascript-packed.js'],
      ['/app/static/dg/zh-Hans/cert/resources/images/favicon.ico',
        BUILD + '/static/dg/zh-Hans/cert/resources/images/favicon.ico'],
      ['/app/codap-config.js',                        BUILD + '/codap-config.js'],
      ['/app/extn/plugins/noaa-codap-plugin/index.html',
        BUILD + '/extn/plugins/noaa-codap-plugin/index.html']
    ])('%s -> %s', (uri, expected) => {
      expect(rewritten(uri)).toBe(expected)
    })
  })

  test('returns the (mutated) request object, never a synthetic response', () => {
    const res = handler(makeEvent('/app/static/dg/en/cert/javascript-packed.js'))
    expect(res.statusCode).toBeUndefined()   // not a response
    expect(typeof res.uri).toBe('string')    // a request
  })

  test('preserves the query string object and method unchanged', () => {
    const res = handler(makeEvent('/app/codap-config.js', { method: 'HEAD' }))
    expect(res.method).toBe('HEAD')
  })

  test('is a no-op for an unexpected non-/app/ path (defensive guard)', () => {
    // Should never be invoked on these (behaviors are /app/...), but must not corrupt them.
    expect(rewritten('/v2/static/dg/en/cert/index.html')).toBe('/v2/static/dg/en/cert/index.html')
    expect(rewritten('/app')).toBe('/app')   // exact /app (no trailing slash) is left alone
  })
})
