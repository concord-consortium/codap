/*
 * Decides whether Rollbar error reporting is on for a page, and which Rollbar environment it reports to.
 *
 * webpack.config.js inlines this file into the Rollbar script in src/index.html, which runs before the
 * main bundle, so it must use ES5 syntax only (ESLint checks this). The last lines export the function
 * for the tests in rollbar-settings.test.ts; in the browser `module` is undefined, so they do nothing.
 */
function getRollbarSettings(location) {
  var host = location.hostname
  // codap.concord.org serves v3 under /app/; codap3.concord.org serves it at the root
  var path = location.pathname.replace(/^\/app(?=\/|$)/, "")
  var isCodapHost = /^codap3?\.concord\.org$/i.test(host)
  var branchMatch = /^\/branch\/([^/]+)\//.exec(path)
  // release workflows copy a build to /<name> (and staging also to /index-<name>.html)
  var namedMatch = /^\/([a-z0-9-]+)$/i.exec(path) || /^\/index-([a-z0-9-]+)\.html$/i.exec(path)
  // other paths (e.g. /version/<tag>/ builds) don't report errors
  var environment
  if (path === "" || path === "/" || path === "/index.html") {
    environment = "production"
  } else if (branchMatch) {
    // only report errors from the main branch, not from feature branches
    environment = branchMatch[1] === "main" ? "main" : undefined
  } else if (namedMatch) {
    environment = namedMatch[1].toLowerCase()
  }
  var isDefaultEnabled = isCodapHost && !!environment

  // The `rollbar` url parameter overrides the default, e.g. to test Rollbar on a branch build.
  // It uses the same rules as `booleanParam()` in src/utilities/url-params.ts: "false", "no",
  // and "0" turn Rollbar off, anything else (including no value) turns it on, last one wins.
  var rollbarParam
  var searchParts = location.search.replace(/^\?/, "").split("&")
  for (var i = 0; i < searchParts.length; ++i) {
    var pair = searchParts[i].split("=")
    if (pair[0] === "rollbar") {
      var value = pair.slice(1).join("=")
      try {
        value = decodeURIComponent(value)
      } catch (e) {
        // Keep malformed values unchanged; they remain truthy unless they match a false token.
      }
      value = value.toLowerCase()
      rollbarParam = value !== "false" && value !== "no" && value !== "0"
    }
  }

  return {
    enabled: rollbarParam === undefined ? isDefaultEnabled : rollbarParam,
    // builds that only report errors because of the `rollbar` url parameter are "development"
    environment: isDefaultEnabled ? environment : "development"
  }
}

if (typeof module === "object" && module.exports) {
  module.exports = { getRollbarSettings: getRollbarSettings }
}
