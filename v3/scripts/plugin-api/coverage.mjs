//
// coverage.mjs
//
// The one definition of "which page documents which resource", shared by the generator and the
// lint. They used to decide this separately — the lint by scanning prose, then by scanning
// selector blocks — and drifted apart, so a resource could be undocumented by one count and
// documented by the other. The mapping lives in each page's generated `actions` block, whose
// header names every resource that page covers, so the page itself is the source of truth.
//
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

export function listPages(resourcesDir) {
  return readdirSync(resourcesDir).filter(f => f.endsWith(".md")).sort()
}

export function buildPageFor(resourcesDir, resources) {
  const pageFor = new Map()   // resource name -> page filename
  for (const page of listPages(resourcesDir)) {
    const text = readFileSync(join(resourcesDir, page), "utf8")
    const header = /<!-- BEGIN GENERATED: actions -->\n\|([^\n]*)\|/.exec(text)
    const cols = header ? header[1].split("|").map(s => s.trim()).filter(Boolean) : []
    // First column is "Action"; the rest name resources, or say "Supported" for a single one.
    const named = cols.slice(1).filter(c => c !== "Supported")
    const covered = named.length ? named : [page.replace(/\.md$/, "")]
    for (const c of covered) pageFor.set(c.replace(/`/g, ""), page)
  }
  // Single-resource pages name the resource by filename in kebab-case; map it back.
  const kebabToName = new Map(resources.map(r =>
    [r.name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), r.name]))
  for (const [key, page] of [...pageFor]) {
    if (!resources.some(r => r.name === key) && kebabToName.has(key)) {
      pageFor.delete(key)
      pageFor.set(kebabToName.get(key), page)
    }
  }

  return pageFor
}
