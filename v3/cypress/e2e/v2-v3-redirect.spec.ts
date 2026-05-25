// CODAP-1323 conformance suite (R28 / R29). Drives a real browser through the full
// positive / negative matrix against the pre-flip temp subdomain. Excluded from the
// default specPattern (it requires the temp subdomain). Run on demand:
//
//   npx cypress run --spec cypress/e2e/v2-v3-redirect.spec.ts \
//     --env redirectBaseUrl=https://codap2to3.concord.org
//
// Produces the G1 / G2 evidence in the RUNBOOK.

const redirectBase = (Cypress.env('redirectBaseUrl') as string) || 'https://codap2to3.concord.org'

// Expected V3 destination after redirect. Per R21 (host-preserving), the function emits
// a relative '/app/' path; the browser resolves it against the current origin. So a test
// against the temp subdomain expects the destination on the temp subdomain, and a test
// against prod expects the destination on prod. Default tracks redirectBase; override
// with redirectV3Destination for unusual cross-host scenarios.
const v3Dest = (Cypress.env('redirectV3Destination') as string) || `${redirectBase}/app/`

interface PositiveRow {
  uri: string
  query?: string
  hash?: string
  expectedLang: string  // '' for English / R1 / R4 / R6a
  expectedQuery?: string  // override when query manipulation differs from lang preprend
  expectedHash?: string
}

const positiveMatrix: PositiveRow[] = [
  // R1: /app -> /app/
  { uri: '/app', expectedLang: '' },
  // R2: English V2 -- /app/static/dg/en/cert/...
  { uri: '/app/static/dg/en/cert/index.html', expectedLang: '' },
  { uri: '/app/static/dg/EN/cert/index.html', expectedLang: '' },
  { uri: '/app/static/dg/en-US/cert/index.html', expectedLang: '' },
  // R3: V2 non-English -- every shipped code.
  { uri: '/app/static/dg/de/cert/index.html', expectedLang: 'de' },
  { uri: '/app/static/dg/el/cert/index.html', expectedLang: 'el' },
  { uri: '/app/static/dg/es/cert/index.html', expectedLang: 'es' },
  { uri: '/app/static/dg/he/cert/index.html', expectedLang: 'he' },
  { uri: '/app/static/dg/ja/cert/index.html', expectedLang: 'ja' },
  { uri: '/app/static/dg/nb/cert/index.html', expectedLang: 'nb' },
  { uri: '/app/static/dg/nn/cert/index.html', expectedLang: 'nn' },
  { uri: '/app/static/dg/pt-BR/cert/index.html', expectedLang: 'pt-BR' },
  { uri: '/app/static/dg/th/cert/index.html', expectedLang: 'th' },
  { uri: '/app/static/dg/tr/cert/index.html', expectedLang: 'tr' },
  { uri: '/app/static/dg/zh-Hans/cert/index.html', expectedLang: 'zh-Hans' },
  { uri: '/app/static/dg/zh-TW/cert/index.html', expectedLang: 'zh-TW' },
  // R3: V3-only + BCP-47-shaped-but-unknown.
  { uri: '/app/static/dg/fa/cert/index.html', expectedLang: 'fa' },
  { uri: '/app/static/dg/xx/cert/index.html', expectedLang: 'xx' },
  // R4: /releases/{name}/
  { uri: '/releases/latest/', expectedLang: '' },
  { uri: '/releases/build_1234/', expectedLang: '' },
  { uri: '/releases/codap_y2/', expectedLang: '' },
  // R5: /releases/{name}/static/dg/{lang}/cert/...
  { uri: '/releases/latest/static/dg/en/cert/index.html', expectedLang: '' },
  { uri: '/releases/latest/static/dg/fr/cert/index.html', expectedLang: 'fr' },
  { uri: '/releases/latest/static/dg/zh-Hans/cert/index.html', expectedLang: 'zh-Hans' },
  // Drive double-click hash preservation.
  {
    uri: '/app/static/dg/en/cert/index.html',
    hash: '#file=googleDrive:abcd1234',
    expectedLang: '',
    expectedHash: '#file=googleDrive:abcd1234'
  },
  // Query + hash combination.
  {
    uri: '/app/static/dg/fr/cert/index.html',
    query: '?launchFromLara=true&documentServer=https://example.com',
    hash: '#shared=xyz',
    expectedLang: 'fr',
    expectedQuery: '?lang=fr&launchFromLara=true&documentServer=https://example.com',
    expectedHash: '#shared=xyz'
  },
  // Real-world CFM-shared URL: URL-encoded chars in the hash (%3A, %2F) must
  // round-trip verbatim through the function and the browser's location.hash.
  {
    uri: '/app/static/dg/fr/cert/index.html',
    query: '?foo=bar',
    hash: '#shared=https%3A%2F%2Fcfm-shared.concord.org%2Fokk5EQ5H8RbOn8UsXpl3%2Ffile.json',
    expectedLang: 'fr'
  },
  // R17a lang collision: path lang wins, query lang stripped.
  {
    uri: '/app/static/dg/fr/cert/index.html',
    query: '?lang=es&foo=bar',
    expectedLang: 'fr',
    expectedQuery: '?lang=fr&foo=bar'
  },
  // R17a/GR2 lang-only query.
  {
    uri: '/app/static/dg/fr/cert/index.html',
    query: '?lang=es',
    expectedLang: 'fr',
    expectedQuery: '?lang=fr'
  },
  // R6a: /v3, /v3/, /v3/anything -> /app/ (collapse).
  { uri: '/v3', expectedLang: '' },
  { uri: '/v3/', expectedLang: '' },
  { uri: '/v3/some/deep/path', expectedLang: '' }
]

function expectedDestination(row: PositiveRow): string {
  let qs = ''
  if (row.expectedQuery !== undefined) {
    qs = row.expectedQuery
  } else if (row.expectedLang) {
    const tail = row.query ? row.query.replace(/^\?/, '&') : ''
    qs = `?lang=${row.expectedLang}${tail}`
  } else {
    qs = row.query || ''
  }
  const hash = row.expectedHash !== undefined ? row.expectedHash : (row.hash || '')
  return `${v3Dest}${qs}${hash}`
}

describe(`CODAP-1323 R28 positive matrix -- V2 URLs redirect to V3 (${redirectBase})`, () => {
  positiveMatrix.forEach((row) => {
    const url = `${redirectBase}${row.uri}${row.query || ''}${row.hash || ''}`
    const expectedUrl = expectedDestination(row)
    it(`${row.uri}${row.query || ''}${row.hash || ''} -> ${expectedUrl}`, () => {
      cy.visit(url, { failOnStatusCode: false })
      // Wait for the client-side redirect: location settles at expectedUrl. Compare
      // decoded forms because the browser URL-canonicalizes special chars in query
      // values (e.g. `documentServer=https://example.com` becomes
      // `documentServer=https%3A%2F%2Fexample.com` in window.location.href), while
      // the function preserves the original verbatim (R15). decodeURIComponent
      // normalizes both sides.
      cy.location('href', { timeout: 15000 }).should((href: string) => {
        expect(decodeURIComponent(href)).to.equal(decodeURIComponent(expectedUrl))
      })
    })
  })

  // R28 iframe-embed: a minimal harness page hosts an iframe whose src is a V2-shape URL;
  // we assert the iframe's final src lands at /app/?... (English: no ?lang=; non-English:
  // ?lang= injected). iframe-phone re-handshake is out of scope (QA-I3).
  //
  // Cypress fixtures are loaded via cy.fixture() -- they are NOT HTTP-served. We use
  // cy.intercept to virtualize a /v2-v3-redirect-iframe-harness.html URL that returns the
  // fixture's bytes, so cy.visit works against the local baseUrl while the iframe inside
  // points cross-origin at redirectBase.
  beforeEach(function setupHarnessIntercept() {
    cy.fixture('v2-v3-redirect-iframe-harness.html').then((html: string) => {
      cy.intercept('GET', '**/v2-v3-redirect-iframe-harness.html*', {
        statusCode: 200,
        headers: { 'content-type': 'text/html' },
        body: html
      })
    })
  })

  it('R28 iframe-embed (English) -- iframe lands at /app/ with hash preserved', () => {
    const inner = `${redirectBase}/app/static/dg/en/cert/index.html?launchFromLara=true#shared=xyz`
    const harness = `/v2-v3-redirect-iframe-harness.html?embed=${encodeURIComponent(inner)}`
    cy.visit(harness, { failOnStatusCode: false })
    cy.get('[data-cy=embed-iframe]', { timeout: 20000 }).should(($iframe) => {
      const w = ($iframe[0] as HTMLIFrameElement).contentWindow
      expect(w, 'iframe window').to.not.equal(null)
      const href = w!.location.href
      expect(href).to.equal(`${v3Dest}?launchFromLara=true#shared=xyz`)
    })
  })

  it('R28 iframe-embed (non-English) -- iframe lands at /app/ with ?lang= and hash', () => {
    const inner = `${redirectBase}/app/static/dg/fr/cert/index.html?launchFromLara=true#shared=xyz`
    const harness = `/v2-v3-redirect-iframe-harness.html?embed=${encodeURIComponent(inner)}`
    cy.visit(harness, { failOnStatusCode: false })
    cy.get('[data-cy=embed-iframe]', { timeout: 20000 }).should(($iframe) => {
      const w = ($iframe[0] as HTMLIFrameElement).contentWindow
      expect(w, 'iframe window').to.not.equal(null)
      const href = w!.location.href
      expect(href).to.equal(`${v3Dest}?lang=fr&launchFromLara=true#shared=xyz`)
    })
  })
})

// R29 negative matrix. Each row asserts BOTH (a) the redirect function did not fire
// (no <!-- codap-redirect --> in body) AND (b) the request hit the expected origin
// (QA-I1). The body marker and/or response header that identifies each origin is
// pinned per row.
type ExpectedOrigin = 'marketing' | 'v2' | 'v3-s3' | 'tp-sampler'

interface NegativeRow {
  url: string                       // absolute URL (allows / on redirectBase root)
  origin: ExpectedOrigin
  // Optional override of the expected positive marker; falls back to the origin defaults.
  bodyContains?: string
  bodyNotContains?: string[]
  headerEquals?: { name: string, value: string }
  headerMatches?: { name: string, pattern: RegExp }
}

const negativeMatrix: NegativeRow[] = [
  // R29 row 1: root -> marketing site.
  { url: `${redirectBase}/`, origin: 'marketing' },
  // R29 V2-origin carve-outs.
  { url: `${redirectBase}/releases/.gapikey`, origin: 'v2' },
  { url: `${redirectBase}/releases/staging`, origin: 'v2' },
  { url: `${redirectBase}/releases/staging/static/dg/en/cert/index.html`, origin: 'v2' },
  { url: `${redirectBase}/releases/zips/foo.zip`, origin: 'v2' },
  { url: `${redirectBase}/releases/var/something`, origin: 'v2' },
  { url: `${redirectBase}/releases/apple-touch-icon.png`, origin: 'v2' },
  { url: `${redirectBase}/v2/something`, origin: 'v2' },
  // R29 V3 S3 origin -- malformed lang / V3 asset shapes.
  { url: `${redirectBase}/app/static/js/bundle.js`, origin: 'v3-s3' },
  { url: `${redirectBase}/app/favicon.ico`, origin: 'v3-s3' },
  { url: `${redirectBase}/app/manifest.json`, origin: 'v3-s3' },
  { url: `${redirectBase}/app/static/dg/abc123/cert/index.html`, origin: 'v3-s3' },
  { url: `${redirectBase}/app/static/dg//cert/index.html`, origin: 'v3-s3' },
  // Redirect-loop safety (R29 redirect-destination paths).
  { url: `${redirectBase}/app/`, origin: 'v3-s3' },
  { url: `${redirectBase}/app/?lang=fr`, origin: 'v3-s3' },
  { url: `${redirectBase}/app/?lang=fr&foo=bar`, origin: 'v3-s3' },
  // /releases/ with empty {name}.
  { url: `${redirectBase}/releases/`, origin: 'v3-s3' },
  // TP-Sampler S3 carve-outs.
  { url: `${redirectBase}/releases/latest/extn/plugins/TP-Sampler/index.html`, origin: 'tp-sampler' },
  { url: `${redirectBase}/app/extn/plugins/TP-Sampler/index.html`, origin: 'tp-sampler' }
]

// Origin-identifying signals (QA-I1 marker map). Markers chosen to work whether the
// origin returns its expected content (prod) or a host-mismatch error (temp subdomain
// pre-flip, where WP Engine doesn't recognize codap2to3.concord.org and V2 paths may
// 404 with empty bodies). Server-header markers are reliable across both cases;
// body markers are reserved for origins that always return identifiable content.
const ORIGIN_SIGNALS: Record<ExpectedOrigin, Partial<NegativeRow>> = {
  marketing: {
    // WP Engine fronts the marketing site with nginx; the server header is present
    // even on host-mismatch 404s from the temp subdomain. `x-powered-by: WP Engine`
    // only appears when WP recognizes the host (prod), not on temp.
    headerMatches: { name: 'server', pattern: /nginx/i }
  },
  v2: {
    // V2 origin is Apache/2.4.65 (Debian); the Server header is present on every
    // response (200/301/404/empty-body), so this marker is reliable regardless of
    // whether the specific path has V2 content.
    headerMatches: { name: 'server', pattern: /Apache/i }
  },
  'v3-s3': {
    // S3 website endpoints set a Server header containing "AmazonS3" on both 200 and 404
    // responses; this marker holds whether the path served a V3 asset or a S3-website 404.
    headerMatches: { name: 'server', pattern: /AmazonS3/i }
  },
  'tp-sampler': {
    // TP-Sampler is served from S3 with its own minimal index containing the literal
    // `<title>Sampler</title>` -- the only V2-shape page that doesn't carry V2's
    // Apache marker (it's served from S3, not codap-server.concord.org).
    bodyContains: '<title>Sampler</title>'
  }
}

describe(`CODAP-1323 R29 negative matrix -- paths that must NOT redirect (${redirectBase})`, () => {
  negativeMatrix.forEach((row) => {
    const expected = { ...ORIGIN_SIGNALS[row.origin], ...row }
    it(`${row.url} -> ${row.origin}`, () => {
      cy.request({
        url: row.url,
        followRedirect: false,
        failOnStatusCode: false
      }).then((res) => {
        // (a) the redirect function did not fire.
        expect(res.body, 'body should not contain redirect marker').to.not.match(
          /<!--\s*codap-redirect\s*-->/)
        // (b) origin-identifying signal.
        if (expected.headerEquals) {
          expect(res.headers[expected.headerEquals.name.toLowerCase()], expected.headerEquals.name)
            .to.equal(expected.headerEquals.value)
        }
        if (expected.headerMatches) {
          const h = res.headers[expected.headerMatches.name.toLowerCase()]
          expect(h, expected.headerMatches.name).to.match(expected.headerMatches.pattern)
        }
        if (expected.bodyContains) {
          expect(res.body, 'body should contain origin marker').to.match(
            new RegExp(expected.bodyContains.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
        }
      })
    })
  })
})
