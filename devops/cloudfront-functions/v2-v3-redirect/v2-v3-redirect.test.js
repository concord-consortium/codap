'use strict'

const {
  loadHandler,
  loadHandlerCapturingLogs,
  makeEvent,
  runClientScript,
  COMMITTED_SOURCE,
  BUILT_ARTIFACT
} = require('./test-harness')

const redirected = (res) => res.statusCode === 200 && /<!-- codap-redirect -->/.test(res.body)

// SE-J3 -- the entire suite below is wrapped in this describe.each, so every assertion
// runs against BOTH the committed source and the built artifact dist/v2-v3-redirect.js
// (the Jest globalSetup builds dist/ at the start of every run -- RR-J1; in watch mode
// that build is from the run's start, not per-edit).
describe.each([
  ['committed source', COMMITTED_SOURCE],
  ['deployed artifact', BUILT_ARTIFACT]
])('v2-v3-redirect.js (%s)', (label, sourceFile) => {
  const handler = loadHandler(sourceFile)

  describe('R28 positive matrix -- paths that must redirect', () => {
    test.each([
      ['/app',                                          ''],     // R1
      ['/app/static/dg/en/cert/index.html',             ''],     // R2 -- English, no ?lang=
      ['/app/static/dg/fr/cert/index.html',             'fr'],   // R3
      ['/app/static/dg/pt-BR/cert/index.html',          'pt-BR'],// R3 region subtag
      ['/app/static/dg/zh-Hans/cert/index.html',        'zh-Hans'],
      ['/app/static/dg/xx/cert/index.html',             'xx'],   // R3 unknown-but-shaped
      ['/app/static/dg/de/cert/index.html',             'de'],
      ['/app/static/dg/es/cert/index.html',             'es'],
      ['/releases/latest/',                             ''],     // R4
      ['/releases/build_1234/',                         ''],
      ['/releases/codap_y2/',                           ''],
      ['/releases/latest/static/dg/fr/cert/index.html', 'fr'],   // R5
      ['/releases/build_1234/static/dg/de/cert/index.html', 'de'],
      ['/v3',                                           ''],     // R6a -- /v3 alias of current V3
      ['/v3/',                                          ''],     // R6a
      ['/v3/some/deep/path',                            '']      // R6a -- collapses to /app/
    ])('%s redirects (lang=%p)', (uri, lang) => {
      const res = handler(makeEvent(uri))
      expect(redirected(res)).toBe(true)
      // the path-detected lang is the JS literal baked into the inline script
      expect(res.body).toContain('var lang="' + lang + '"')
    })

    test('English V2 codes (en, EN, en-US, EN-us) get no ?lang=', () => {
      for (const code of ['en', 'EN', 'en-US', 'EN-us', 'en-us']) {
        const res = handler(makeEvent('/app/static/dg/' + code + '/cert/index.html'))
        expect(res.body).toContain('var lang=""')
      }
    })

    test('non-English region-subtag variants do NOT get English treatment', () => {
      // The English rule (R3) covers only `en` / `en-US` case-insensitively. `en-GB` is
      // *not* English under the rule -- it gets ?lang=en-GB verbatim.
      const res = handler(makeEvent('/app/static/dg/en-GB/cert/index.html'))
      expect(res.body).toContain('var lang="en-GB"')
    })

    test('HEAD requests to a redirect path produce the synthetic 200 (R18a / PLUG2)', () => {
      // R18a intercepts HEAD as well as GET; PLUG2 -- the function returns the same
      // response object for both (CloudFront strips the body for HEAD downstream). Guards
      // against a future refactor narrowing the method check to GET only.
      const get = handler(makeEvent('/app'))
      const head = handler(makeEvent('/app', { method: 'HEAD' }))
      expect(head.statusCode).toBe(200)
      expect(head.headers).toEqual(get.headers)   // identical status + headers to GET
    })

    describe('client-side query + hash construction (R15-R17a, jsdom)', () => {
      test('hash preserved verbatim, no ?lang= for English', () => {
        const res = handler(makeEvent('/app/static/dg/en/cert/index.html'))
        expect(runClientScript(res.body, { hash: '#file=googleDrive:abcd1234' }))
          .toBe('/app/#file=googleDrive:abcd1234')
      })

      test('R17a -- path lang wins, query lang stripped, others verbatim', () => {
        const res = handler(makeEvent('/app/static/dg/fr/cert/index.html'))
        expect(runClientScript(res.body, {
          search: '?lang=es&launchFromLara=true&documentServer=https://example.com',
          hash: '#shared=xyz'
        }))
          .toBe('/app/?lang=fr&launchFromLara=true' +
                '&documentServer=https://example.com#shared=xyz')
      })

      test('R17a/GR2 -- lang-only query yields no trailing &', () => {
        const res = handler(makeEvent('/app/static/dg/fr/cert/index.html'))
        expect(runClientScript(res.body, { search: '?lang=es' }))
          .toBe('/app/?lang=fr')
      })

      test('GR3 -- duplicate non-lang params preserved in order', () => {
        const res = handler(makeEvent('/app/static/dg/fr/cert/index.html'))
        expect(runClientScript(res.body, { search: '?foo=1&foo=2' }))
          .toBe('/app/?lang=fr&foo=1&foo=2')
      })

      test('no query, no hash: /app -> /app/', () => {
        const res = handler(makeEvent('/app'))
        expect(runClientScript(res.body)).toBe('/app/')
      })

      test('English path with a non-lang query: query preserved verbatim, no ?lang=', () => {
        const res = handler(makeEvent('/app/static/dg/en/cert/'))
        expect(runClientScript(res.body, { search: '?foo=bar&baz=qux' }))
          .toBe('/app/?foo=bar&baz=qux')
      })

      test('/v3 collapses to /app/, preserves query + hash', () => {
        const res = handler(makeEvent('/v3/some/deep/path'))
        expect(runClientScript(res.body, { search: '?x=1', hash: '#h=v' }))
          .toBe('/app/?x=1#h=v')
      })

      test('R5 -- /releases/{name}/static/dg/{lang}/cert preserves lang', () => {
        const res = handler(makeEvent('/releases/latest/static/dg/zh-Hans/cert/index.html'))
        expect(runClientScript(res.body, { hash: '#k=v' }))
          .toBe('/app/?lang=zh-Hans#k=v')
      })

      // R17a (verbatim-preservation half): when the path matches R1, R2, R4, or R6a (no
      // path-detected lang), the original query string MUST be preserved verbatim --
      // including any `?lang=` the user passed. This is the inverse of the R3/R5 lang-
      // wins rule and is easy to regress by sharing the rebuild logic across both cases.
      test('R17a -- R1 /app with ?lang= preserves it verbatim', () => {
        const res = handler(makeEvent('/app'))
        expect(runClientScript(res.body, { search: '?lang=fr' }))
          .toBe('/app/?lang=fr')
      })

      test('R17a -- R2 (English V2 path) preserves an incoming ?lang= verbatim', () => {
        const res = handler(makeEvent('/app/static/dg/en/cert/index.html'))
        expect(runClientScript(res.body, { search: '?lang=fr&foo=bar' }))
          .toBe('/app/?lang=fr&foo=bar')
      })

      test('R17a -- R4 /releases/{name}/ preserves an incoming ?lang= verbatim', () => {
        const res = handler(makeEvent('/releases/latest/'))
        expect(runClientScript(res.body, { search: '?lang=de' }))
          .toBe('/app/?lang=de')
      })

      test('R17a -- R6a /v3 preserves an incoming ?lang= verbatim', () => {
        const res = handler(makeEvent('/v3'))
        expect(runClientScript(res.body, { search: '?lang=de&x=1' }))
          .toBe('/app/?lang=de&x=1')
      })
    })
  })

  describe('R29 negative matrix -- paths that must NOT redirect (fall through to origin)', () => {
    // [request uri, expected request.uri after the function runs]. Under IQ1=B1 the
    // function strips the /app prefix on /app/* fall-through paths (R1a); /releases/* is
    // unchanged. `/` is a routing-handled negative (function not attached to the default
    // behavior) -- covered by the Cypress suite, not here.
    test.each([
      ['/app/static/js/bundle.js',                          '/static/js/bundle.js'],
      ['/app/favicon.ico',                                  '/favicon.ico'],             // GR4
      ['/app/manifest.json',                                '/manifest.json'],           // GR4
      ['/app/static/dg//cert/index.html',                   '/static/dg//cert/index.html'], // empty {lang}
      ['/app/static/dg/abc123/cert/index.html',             '/static/dg/abc123/cert/index.html'], // digits
      ['/app/static/dg/a/cert/index.html',                  '/static/dg/a/cert/index.html'], // single-letter
      ['/app/static/dg/<script>alert(1)</script>/cert/x',   '/static/dg/<script>alert(1)</script>/cert/x'],
      ['/releases/',                                        '/releases/']                // empty {name}
    ])('%s falls through (no synthetic response), uri -> %s', (uri, expected) => {
      const res = handler(makeEvent(uri))
      expect(res.statusCode).toBeUndefined()    // no synthetic redirect produced
      expect(res.uri).toBe(expected)
    })

    test('redirect destinations fall through, /app stripped -- no loop (QA-F5)', () => {
      for (const qs of ['', 'lang=fr', 'lang=fr&foo=bar']) {
        const res = handler(makeEvent('/app/', { querystring: qs }))
        expect(res.statusCode).toBeUndefined()
        expect(res.uri).toBe('/')
      }
    })

    test('non-GET/HEAD methods fall through unchanged, not even /app-stripped (R18a)', () => {
      for (const method of ['POST', 'OPTIONS', 'PUT', 'DELETE', 'PATCH']) {
        const res = handler(makeEvent('/app/static/dg/fr/cert/index.html', { method }))
        expect(res.statusCode).toBeUndefined()
        expect(res.uri).toBe('/app/static/dg/fr/cert/index.html')
      }
    })

    test('R3 lang-shape pattern rejects digits, mixed digit/letter, and oversize subtags', () => {
      // The pattern is [A-Za-z]{2,3}(-[A-Za-z]{2,4})?  -- pure letters in the right counts.
      const rejects = [
        '/app/static/dg/a/cert/index.html',         // 1 letter
        '/app/static/dg/abcd/cert/index.html',      // 4 letters in primary subtag
        '/app/static/dg/fr-/cert/index.html',       // trailing dash, empty region
        '/app/static/dg/fr-FRANCE/cert/index.html', // 6-letter region subtag
        '/app/static/dg/12/cert/index.html'         // digits
      ]
      for (const uri of rejects) {
        const res = handler(makeEvent(uri))
        expect(res.statusCode).toBeUndefined()
      }
    })
  })

  describe('synthetic response shape (R19c, R20a)', () => {
    const res = handler(makeEvent('/app'))
    test('status 200 and the four mandated headers', () => {
      expect(res.statusCode).toBe(200)
      expect(res.headers['content-type'].value).toBe('text/html; charset=utf-8')
      expect(res.headers['cache-control'].value).toBe('no-store')
      expect(res.headers['x-content-type-options'].value).toBe('nosniff')
      expect(res.headers['content-security-policy'].value)
        .toBe("default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'")
    })

    test('body content (R19c)', () => {
      expect(res.body).toContain('<html lang="en">')
      expect(res.body).toContain('<title>CODAP</title>')
      expect(res.body).toContain('<p role="status">Loading CODAP...</p>')   // WCAG-I1
      expect(res.body).toContain('<noscript>')
      expect(res.body).toContain('<a href="/app/">Open CODAP</a>')
    })

    test('the R26b marker appears exactly once', () => {
      const matches = res.body.match(/<!-- codap-redirect -->/g) || []
      expect(matches.length).toBe(1)
    })
  })

  describe('CODAP-1323 cached-launch recovery -- clear-site-data on subresource redirects', () => {
    // A redirect-matched *subresource* (the asset a stale cached V2 shell re-fetches) carries
    // `clear-site-data: "cache"` so the browser evicts that shell; a *navigation* must not, so
    // the synthetic->V3 redirect (and the post-recovery V3 load) keeps the cache intact.
    test.each([
      '/app/static/dg/en/cert/javascript-packed.js',
      '/app/static/dg/en/cert/stylesheet-packed-0.css',
      '/app/static/dg/en/cert/resources/build/codap-lib-bundle.js.ignore',
      '/app/static/dg/fr/cert/javascript-packed.js'
    ])('%s (subresource) -> clear-site-data "cache"', (uri) => {
      const res = handler(makeEvent(uri))
      expect(res.statusCode).toBe(200)                                  // still the synthetic page
      expect(res.headers['clear-site-data'].value).toBe('"cache"')
    })

    test.each([
      '/app',                                       // R1 exact (extensionless)
      '/v3',                                         // R6a (extensionless)
      '/v3/some/deep/path',                          // R6a deep nav (extensionless)
      '/app/static/dg/en/cert/index.html',          // cert shell (.html)
      '/app/static/dg/en/cert/',                     // cert dir (trailing slash)
      '/app/static/dg/en/cert',                      // cert dir (slashless, extensionless)
      '/releases/latest/'                            // R4 (trailing slash)
    ])('%s (navigation) -> NO clear-site-data', (uri) => {
      const res = handler(makeEvent(uri))
      expect(res.statusCode).toBe(200)                                  // synthetic page, clean redirect
      expect(res.headers['clear-site-data']).toBeUndefined()
    })
  })

  describe('logging + exception paths (R23, R30, R18b -- SE-J1)', () => {
    test('per-match redirect line: tag + R17a-processed destination (LOG_ENABLED=true)', () => {
      const { handler: h, logs } = loadHandlerCapturingLogs(sourceFile)
      h(makeEvent('/app/static/dg/fr/cert/index.html', { querystring: 'lang=es&foo=bar' }))
      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatch(/^codap-redirect tag=app-lang /)
      // logged destination is server-side: path lang wins, query lang dropped (R30 / CR11)
      expect(logs[0]).toContain('dest=/app/?lang=fr&foo=bar')
    })

    test('no-match line records the post-/app-strip newuri', () => {
      const { handler: h, logs } = loadHandlerCapturingLogs(sourceFile)
      h(makeEvent('/app/static/js/bundle.js'))
      expect(logs[0]).toMatch(/^codap-redirect tag=no-match /)
      expect(logs[0]).toContain('newuri=/static/js/bundle.js')
    })

    test('logSafe neutralizes whitespace and control characters in request-derived values', () => {
      const { handler: h, logs } = loadHandlerCapturingLogs(sourceFile)
      // /releases/<name>/ -- a space and tab inside {name} are R29-shape (non-matching);
      // the fall-through path logs the URI through logSafe, where ws -> '?'.
      h(makeEvent('/releases/a b\tc/'))
      expect(logs[0]).toContain('uri=/releases/a?b?c/')
    })

    test('logSafe also neutralizes newlines (CW log-line injection guard)', () => {
      const { handler: h, logs } = loadHandlerCapturingLogs(sourceFile)
      h(makeEvent('/releases/foo\nbar/'))
      // Confirm: no embedded newline in the captured line (it was replaced with '?').
      expect(logs[0].split('\n')).toHaveLength(1)
      expect(logs[0]).toContain('uri=/releases/foo?bar/')
    })

    test('catch block emits the error-fallthrough line the R26b metric filter keys on', () => {
      const { handler: h, logs, sandbox } = loadHandlerCapturingLogs(sourceFile)
      sandbox.buildResponse = () => { throw new Error('induced') } // throw; uri stays a string
      const res = h(makeEvent('/app'))
      expect(res.statusCode).toBeUndefined()    // R18b -- falls through to origin
      expect(logs.some((l) => l.indexOf('codap-redirect tag=error-fallthrough') === 0)).toBe(true)
    })
  })
})  // end describe.each -- runs the whole suite against committed source AND deployed artifact
