// Lists the Cypress specs the parallel runner should run.

const fs = require("fs")

// Copied from cypress.config.ts, which is TypeScript and can't be required here.
// specs.test.js fails if the two drift apart.
const SPEC_PATTERN = "cypress/e2e/**/*.{js,jsx,ts,tsx}"
const EXCLUDE_SPEC_PATTERNS = ["**/v2-v3-redirect.spec.ts"]
const DEFAULT_BASE_URL = "http://localhost:8080"

const toPosix = file => file.split("\\").join("/")
const glob = (pattern, cwd) => fs.globSync(pattern, { cwd }).map(toPosix)

// Returns the spec paths matching `pattern` (a glob or an array of globs) relative to `cwd`,
// sorted, without the excluded specs.
function findSpecs({ cwd, pattern = SPEC_PATTERN }) {
  const excluded = new Set(EXCLUDE_SPEC_PATTERNS.flatMap(exclude => glob(exclude, cwd)))
  return glob(pattern, cwd).filter(spec => !excluded.has(spec)).sort()
}

// A file-name-safe name for a spec, used for its log file and downloads folder.
function specSlug(spec) {
  return spec.replace(/^cypress\/e2e\//, "").replace(/\.[jt]sx?$/, "").split("/").join("__")
}

module.exports = { DEFAULT_BASE_URL, EXCLUDE_SPEC_PATTERNS, SPEC_PATTERN, findSpecs, specSlug }
