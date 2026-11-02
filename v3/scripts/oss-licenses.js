// Formats the files that webpack-license-plugin writes next to index.html (see webpack.config.js).
// Each function receives the plugin's package list: [{ name, version, license, repository, licenseText,
// noticeText }], where everything but name and version may be missing.

const fs = require("fs")

// Real license texts for packages whose license file the plugin can't find (it then falls back to the
// generic text from spdx.org, which has no copyright line). Keyed by "<name>@<version>" so that updating
// the package makes someone check again.
const kLicenseTextOverrides = {
  // no license file; the README includes the license
  "@nedb/binary-search-tree@2.1.5": () => `(The MIT License)

Copyright (c) 2013 Louis Chatriot <louis.chatriot@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`,
  // the plugin only looks for files named LICENSE or LICENCE
  "rtree@1.4.2": () => fs.readFileSync(require.resolve("rtree/MIT-LICENSE.md"), "utf8")
}

// Code-unit order rather than localeCompare, so the output doesn't depend on the build machine's locale.
function compareStrings(a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}

function compareLibraries(a, b) {
  return compareStrings(a.name, b.name) || compareStrings(a.version, b.version)
}

function licenseOf(pkg) {
  return pkg.license || "Unknown"
}

function licenseTextOf(pkg) {
  const override = kLicenseTextOverrides[`${pkg.name}@${pkg.version}`]
  return override ? override() : pkg.licenseText
}

// Wraps text in a code fence longer than any run of backticks inside it.
function fence(text) {
  const longestRun = Math.max(0, ...(text.match(/`+/g) || []).map(run => run.length))
  const ticks = "`".repeat(Math.max(3, longestRun + 1))
  return `${ticks}\n${text.trim()}\n${ticks}`
}

// The About dialog's list: name, version, and license only, sorted by name.
function ossLibrariesJson(packages) {
  const libraries = [...packages]
    .sort(compareLibraries)
    .map(pkg => ({ name: pkg.name, version: pkg.version, license: licenseOf(pkg) }))
  return JSON.stringify(libraries)
}

// The full license (and NOTICE) text of every package, linked from the About dialog.
function thirdPartyNoticesMarkdown(packages) {
  const sections = [...packages].sort(compareLibraries).map(pkg => {
    const licenseText = licenseTextOf(pkg)
    const lines = [`## ${pkg.name} ${pkg.version}`, "", `- License: ${licenseOf(pkg)}`]
    if (pkg.repository) lines.push(`- Repository: ${pkg.repository}`)
    lines.push("", licenseText ? fence(licenseText) : "No license text was found for this package.")
    if (pkg.noticeText) lines.push("", "Notice:", "", fence(pkg.noticeText))
    return lines.join("\n")
  })
  return [
    "# Third-Party Notices",
    "CODAP includes the following open-source software. Each package's license and notices are reproduced below.",
    ...sections
  ].join("\n\n") + "\n"
}

module.exports = { ossLibrariesJson, thirdPartyNoticesMarkdown }
