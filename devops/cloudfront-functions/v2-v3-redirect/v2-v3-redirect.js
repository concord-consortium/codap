'use strict'
// CloudFront Function -- V2 -> V3 redirects for codap.concord.org   [CODAP-1323]
// Runtime: cloudfront-js-2.0   Stage: viewer-request
// Spec: specs/CODAP-1323-redirect-v2-to-v3/   This is the committed, fully-commented source;
// the deployed artifact is dist/v2-v3-redirect.js -- comments stripped by build-function.sh (R20b).
//
// Attached to the /app, /app/*, /releases/*, /v3 and /v3/* cache behaviors of the CLONED
// distribution only -- never E3H9X49AG3GYSO (R18, R22). For a V2-shape URL it returns a
// synthetic 200 HTML page whose inline JS client-side redirects to V3, preserving the
// URL hash (a server-side 301/302 cannot). For a non-V2 /app/* path it strips the /app
// prefix so the request resolves against the V3 S3 origin (IQ1 = B1); /releases/* and
// other non-matching paths pass through to origin unchanged.

// --- Configuration constants (R21, R23) -------------------------------------------------
// V3_BASE_URL is a HOST-PRESERVING relative path. The browser resolves it against the
// current origin, so a redirect from `https://codap2to3.concord.org/app` lands on
// `https://codap2to3.concord.org/app/` (V3 on the temp subdomain) and a redirect from
// `https://codap.concord.org/app` lands on `https://codap.concord.org/app/` (V3 on prod,
// post-flip). Post-flip the canonical V3 URL is still `https://codap.concord.org/app/`;
// the function just no longer hardcodes the host so pre-flip testing on the temp
// subdomain actually reaches V3 instead of being bounced to prod (which is still V2).
var V3_BASE_URL = '/app'                            // R21 -- host-preserving relative; no trailing slash
var V3_DEST = V3_BASE_URL + '/'                     // redirect lands here (Q8 = trailing slash) => '/app/'
var LOG_ENABLED = false                             // R23 -- per-match logging; false in committed source

// --- Path-match patterns ----------------------------------------------------------------
// {lang}: BCP-47-shaped, 2-3 letter subtag + optional 2-4 letter subtag (R3).
// {name}: one-or-more non-slash characters (R4). Patterns are start-anchored; the literal
// `static/dg/.../cert` frame is matched exactly; a trailing path after `cert` is optional.
// R28/R29 are the conformance bar for these patterns (requirements SE-F2).
var RE_APP_LANG  = /^\/app\/static\/dg\/([A-Za-z]{2,3}(?:-[A-Za-z]{2,4})?)\/cert(?:\/.*)?$/
var RE_REL_LANG  = /^\/releases\/[^/]+\/static\/dg\/([A-Za-z]{2,3}(?:-[A-Za-z]{2,4})?)\/cert(?:\/.*)?$/
var RE_RELEASES  = /^\/releases\/[^/]+(?:\/.*)?$/
var RE_V3        = /^\/v3(?:\/.*)?$/   // R6a -- /v3 and /v3/* are an alias of current V3 (/app/)

// --- Synthetic-response HTML (R19, R19a-c, R20, R20a) -----------------------------------
// Static body text only (R19a). The single request-derived value, {lang}, is embedded ONLY
// in the inline <script> as a JS string literal. <!-- codap-redirect --> is the R26b marker.
// The client-side JS operates on the RAW query string (no URLSearchParams) to preserve it
// verbatim (R15) and to keep duplicate parameters (R17a / GR3).
var HTML_HEAD =
  '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
  '<title>CODAP</title>' +
  '<style>body{font-family:sans-serif;text-align:center;padding:2em}</style>' +
  '</head><body><!-- codap-redirect -->' +
  '<p role="status">Loading CODAP...</p>' +   // role=status -- WCAG-I1
  '<noscript><p><a href="' + V3_DEST + '">Open CODAP</a></p>' +
  '<p>This page needs JavaScript to send you to CODAP automatically. ' +
  'Use the link above to continue. ' +
  "(Your link's saved settings may not carry over.)</p></noscript>" +
  '<script>(function(){' +
  'var lang="'
// R17a: when path-detected `lang` is non-empty (R3/R5 -- the only paths that contribute
// a lang), prepend it and strip any incoming `?lang=` pair. When it is empty (R1, R2, R4,
// R6a), preserve the original query VERBATIM -- including any `?lang=` the user passed.
var HTML_TAIL =
  '";' +
  'var s=window.location.search;' +
  'var qs;' +
  'if(lang){' +
    'var pairs=s?s.slice(1).split("&"):[];' +
    'var out=["lang="+lang];' +
    'for(var i=0;i<pairs.length;i++){' +
      'var p=pairs[i];if(p===""){continue;}' +
      'var eq=p.indexOf("=");' +
      'var n=eq<0?p:p.slice(0,eq);' +
      'if(n==="lang"){continue;}' +
      'out.push(p);' +
    '}' +
    'qs="?"+out.join("&");' +
  '}else{' +
    'qs=s;' +
  '}' +
  'window.location.replace("' + V3_DEST + '"+qs+window.location.hash);' +
  '})();</script></body></html>'

// --- Helpers ----------------------------------------------------------------------------
// R21a -- \u-escape every character that could break out of the inline <script>'s
// `var lang="..."` string literal. The escaped character class covers:
//   \  "  '        backslash and quote characters -- JS string-literal delimiters.
//   <  >  &  /     HTML-context metacharacters -- so an embedded value cannot form the
//                  substring `</script>` and close the <script> element early.
//   \r  \n         carriage return and line feed -- both terminate a JS string literal.
//   \u2028 \u2029  U+2028 LINE SEPARATOR and U+2029 PARAGRAPH SEPARATOR -- the non-obvious
//                  pair that ALSO terminates a JS string literal. They are written here as
//                  \u-escapes, never as literal characters, so this security-relevant regex
//                  stays all-ASCII and reviewable in a diff (SE-I1).
// {lang} is regex-constrained to [A-Za-z-] by R3, so in practice jsStringEscape never has
// anything to escape -- it is kept purely as defense-in-depth (R21a).
function jsStringEscape(s) {
  return s.replace(/[\\"'<>&\/\r\n\u2028\u2029]/g, function (c) {
    return '\\u' + ('000' + c.charCodeAt(0).toString(16)).slice(-4)
  })
}

// R3 English-detection rule: a {lang} is English iff it case-insensitively equals
// `en` or `en-US`. English => '' (no ?lang=, route per R2); anything else => verbatim code.
function normalizeLang(code) {
  var lc = code.toLowerCase()
  return (lc === 'en' || lc === 'en-us') ? '' : code
}

// Reconstruct the query string from the CloudFront Functions event model for logging only.
// request.querystring is an object keyed by name: { value, multiValue:[{value}] }.
function reconstructQuery(qs) {
  var parts = []
  for (var name in qs) {
    if (!qs.hasOwnProperty(name)) { continue }
    var entry = qs[name]
    var values = entry.multiValue && entry.multiValue.length ? entry.multiValue
                                                             : [{ value: entry.value }]
    for (var i = 0; i < values.length; i++) {
      parts.push(values[i].value === '' ? name : name + '=' + values[i].value)
    }
  }
  return parts.join('&')
}

// SEC-I1 -- neutralize whitespace and control characters in any request-derived value before
// it is interpolated into a console.log line. Prevents CloudWatch log-line injection (a
// newline forging a fake entry) and stops a crafted URI from forging the contiguous
// `codap-redirect tag=error-fallthrough` token sequence the R26b metric filter keys on.
function logSafe(s) {
  return String(s).replace(/[\s\u0000-\u001f\u007f]/g, '?')
}

// R30 -- server-side destination for the log line: V3_DEST + R17a-processed query.
// When path-detected `lang` is non-empty (R3/R5), it wins and any incoming query `lang`
// is dropped. When path lang is empty (R1, R2, R4, R6a), the original query is preserved
// verbatim. The hash is appended client-side (R19) and is never seen by the function, so
// it is not part of the log line.
function logDestination(lang, rawQuery) {
  if (!lang) {
    return V3_DEST + (rawQuery ? '?' + rawQuery : '')
  }
  var pairs = rawQuery ? rawQuery.split('&') : []
  var out = ['lang=' + lang]
  for (var i = 0; i < pairs.length; i++) {
    var p = pairs[i]
    if (p === '') { continue }
    var eq = p.indexOf('=')
    var n = eq < 0 ? p : p.slice(0, eq)
    if (n === 'lang') { continue }
    out.push(p)
  }
  return V3_DEST + '?' + out.join('&')
}

function buildResponse(lang) {
  return {
    statusCode: 200,
    statusDescription: 'OK',
    headers: {
      'content-type':           { value: 'text/html; charset=utf-8' },
      'cache-control':          { value: 'no-store' },
      'content-security-policy':{ value: "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'" },
      'x-content-type-options': { value: 'nosniff' }
      // 'strict-transport-security' is added here ONLY if R26a's synthetic-response check
      // (Step 5) finds the response-headers policy does not cover this synthetic response
      // (R20a HSTS contingency / CR8).
    },
    body: HTML_HEAD + jsStringEscape(lang) + HTML_TAIL
  }
}

// --- Entry point ------------------------------------------------------------------------
function handler(event) {
  try {
    var request = event.request
    var method = request.method
    if (method !== 'GET' && method !== 'HEAD') {
      return request                                  // R18a -- non-GET/HEAD falls through
    }
    var uri = request.uri
    var lang = null                                   // null = no match; '' = match, no ?lang=
    var tag = 'no-match'

    if (uri === '/app') {                             // R1
      lang = ''; tag = 'app-exact'
    } else if (RE_V3.test(uri)) {                     // R6a -- /v3, /v3/* -> /app/ (alias of V3)
      lang = ''; tag = 'v3'
    } else {
      var m = RE_APP_LANG.exec(uri)                   // R2 / R3
      if (m) {
        lang = normalizeLang(m[1]); tag = lang ? 'app-lang' : 'app-en'
      } else if ((m = RE_REL_LANG.exec(uri))) {       // R5 (check before R4 -- more specific)
        lang = normalizeLang(m[1]); tag = lang ? 'releases-lang' : 'releases-en'
      } else if (RE_RELEASES.test(uri)) {             // R4
        lang = ''; tag = 'releases'
      }
    }

    if (lang === null) {
      // Not a V2-shape path. Under /app/* strip the /app prefix (IQ1 = B1 / R1a) so the
      // request resolves against the V3 S3 origin (content rooted at codap3/). /releases/*
      // and any other path have no /app/ prefix, so this is a natural no-op for them.
      if (uri.indexOf('/app/') === 0) {
        request.uri = uri.slice(4)
      }
      if (LOG_ENABLED) {
        console.log('codap-redirect tag=no-match uri=' + logSafe(uri) +
                    ' qs=' + logSafe(reconstructQuery(request.querystring)) +
                    ' action=origin newuri=' + logSafe(request.uri))
      }
      return request
    }

    if (LOG_ENABLED) {
      var rawQuery = reconstructQuery(request.querystring)
      console.log('codap-redirect tag=' + tag + ' uri=' + logSafe(uri) +
                  ' qs=' + logSafe(rawQuery) +
                  ' action=redirect dest=' + logSafe(logDestination(lang, rawQuery)))
    }
    return buildResponse(lang)
  } catch (e) {
    // R18b -- a caught error returns a valid `request`, which CloudFront counts as a
    // SUCCESSFUL execution: it does NOT register on FunctionExecutionErrors. This log line
    // is therefore emitted UNCONDITIONALLY (independent of LOG_ENABLED) so the caught
    // exception stays observable; the R26b metric filter alarms on the "error-fallthrough"
    // tag. (R18b, R30, REL-F1.)
    try {
      console.log('codap-redirect tag=error-fallthrough uri=' + logSafe(event.request.uri) +
                  ' qs=' + logSafe(reconstructQuery(event.request.querystring)) +
                  ' error=' + logSafe(e && e.message ? e.message : e))
    } catch (e2) { /* never let logging itself break the fall-through */ }
    return event.request
  }
}
