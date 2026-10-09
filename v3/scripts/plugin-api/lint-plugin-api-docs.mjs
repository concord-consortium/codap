#!/usr/bin/env node
//
// lint-plugin-api-docs.mjs
//
// Checks the reference in v3/doc/plugin-api/ against the code and against its own conventions,
// so "the docs are accurate" is a build-time fact rather than a review-time judgment.
//
// Checks:
//   json          every ```json block parses
//   links         every relative link resolves
//   tables        every markdown table row has its header's column count
//   markers       BEGIN/END GENERATED markers pair up, and names are unique within a page
//   scope-drift   pages report no more scope variants than there are scope cases
//   errors        a quoted phrase that reads like an error message exists in the code
//   citations     no source file:line citations (external pages; conventions.md is exempt)
//   issue-ids     no internal issue-tracker ids
//   placeholders  no CODAP-internal %@ i18n notation
//   sections      each resource page has the required sections and a provenance header
//   coverage      which resources in the code have no page (reported; --strict to fail)
//
// Undocumented resources are expected while resources still lack pages, so coverage is
// reported but only fails with --strict.
//
// Usage: node lint-plugin-api-docs.mjs [--strict]
// Exit code 1 if any check fails.
//
import { readFileSync, readdirSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join, relative, normalize } from "node:path"
import { markerProblems } from "./markers.mjs"
import { buildPageFor } from "./coverage.mjs"
import { readInventory } from "./inventory.mjs"

const here = dirname(fileURLToPath(import.meta.url))
const v3Dir = join(here, "..", "..")
const docsDir = join(v3Dir, "doc", "plugin-api")
const strict = process.argv.includes("--strict")

const inventory = readInventory()

const problems = []
const fail = (file, msg) => problems.push(`${file}: ${msg}`)

function allMarkdown(dir, out = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name)
    if (name.isDirectory()) allMarkdown(p, out)
    else if (name.name.endsWith(".md")) out.push(p)
  }
  return out
}

const files = allMarkdown(docsDir).sort()
const REQUIRED_SECTIONS = ["## Supported actions", "## Resource selector patterns", "## Values",
                           "## Examples", "## Notifications", "## Errors"]
const knownErrors = new Set(inventory.errors.map(e => e.message))
const scopeBlocks = new Map()   // block text -> [files]

for (const file of files) {
  const name = relative(docsDir, file)
  const raw = readFileSync(file, "utf8")
  const isResourcePage = name.startsWith("resources/")
  const isConventions = name === "conventions.md"
  const outsideFences = raw.replace(/```[\s\S]*?```/g, "")

  // json
  for (const [i, body] of [...raw.matchAll(/```json\n([\s\S]*?)```/g)].entries()) {
    try { JSON.parse(body[1]) } catch (e) { fail(name, `json block ${i + 1} does not parse: ${e.message}`) }
  }

  // links
  for (const m of outsideFences.matchAll(/\]\(([^)#][^)]*?)(?:#[^)]*)?\)/g)) {
    const target = m[1]
    if (/^https?:/.test(target)) continue
    if (!existsSync(normalize(join(dirname(file), target)))) fail(name, `broken link: ${target}`)
  }

  // tables
  const lines = raw.split("\n")
  const cols = l => l.replace(/\\\|/g, "").split("|").length
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim().startsWith("|") || !/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? "")) continue
    const want = cols(lines[i])
    for (let j = i + 2; j < lines.length && lines[j].trim().startsWith("|"); j++) {
      if (cols(lines[j]) !== want) {
        fail(name, `line ${j + 1}: table row has ${cols(lines[j]) - 1} cells, header has ${want - 1}`)
      }
    }
  }

  // markers — the same ordered walk the generator runs before it rewrites anything, so the lint
  // and the generator cannot disagree about whether a page is safe: unmatched, crossed, nested,
  // duplicated and malformed markers are all rejected here and there by the same code.
  for (const problem of markerProblems(raw)) fail(name, problem)

  // scope drift
  const scope = /<!-- BEGIN GENERATED: scope -->\n([\s\S]*?)\n<!-- END GENERATED: scope -->/.exec(raw)
  if (scope) {
    if (!scopeBlocks.has(scope[1])) scopeBlocks.set(scope[1], [])
    scopeBlocks.get(scope[1]).push(name)
  }

  // error strings quoted in prose must exist in the code
  if (!isConventions) {
    // Any backticked phrase that reads like an error message: starts with a capital and contains
    // one of a few error-ish keywords. That is deliberately narrow — it cannot check strings like
    // `unknown request: <value>` — so it catches invented errors, not every mismatch.
    for (const m of raw.matchAll(/`([A-Z][^`\n]{6,120})`/g)) {
      const quoted = m[1]
      if (knownErrors.has(quoted)) continue
      // tolerate the generator's neutral placeholders and page-specific named ones
      const normalized = quoted.replace(/<[\w\d]+>/g, "%@")
      const matches = [...knownErrors].some(e => e.replace(/%@\d?/g, "%@") === normalized)
      if (!matches && /not found|not supported|required|Unsupported|Unable|Cannot|Invalid/i.test(quoted)) {
        fail(name, `quoted error string not found in code: "${quoted}"`)
      }
    }
  }

  // external-page hygiene
  if (!isConventions) {
    for (const m of outsideFences.matchAll(/`[\w-]+\.(?:ts|tsx):\d+/g)) {
      fail(name, `source citation on an external page: ${m[0]}\``)
    }
    for (const m of raw.matchAll(/\bCODAP-\d{3,}\b/g)) fail(name, `internal issue id on an external page: ${m[0]}`)
    for (const m of outsideFences.matchAll(/%@\d?/g)) fail(name, `CODAP-internal placeholder notation: ${m[0]}`)
  }

  // resource page shape
  if (isResourcePage) {
    for (const s of REQUIRED_SECTIONS) if (!raw.includes(s)) fail(name, `missing required section: ${s}`)
    if (!/^> \*\*Applies to:\*\*/m.test(raw)) fail(name, "missing provenance header")
    if (!raw.startsWith("# ")) fail(name, "page does not start with a title")
  }
}

// There is one scope paragraph per scope case, so more variants than cases means a page has
// drifted from what the generator writes.
if (scopeBlocks.size > 3) {
  problems.push(`scope blocks: ${scopeBlocks.size} distinct variants; expected at most 3 (one per scope case)`)
}

// notifications — every operation CODAP can send must appear on the notifications page. The
// generated blocks list them; the prose beside those blocks says when each fires and what it
// carries, and nothing checks that prose. Without this, a notification added in code lands in
// the generated table with no explanation and nobody notices.
{
  const page = join(docsDir, "notifications.md")
  if (existsSync(page)) {
    const raw = readFileSync(page, "utf8")
    // Outside the generated blocks: that is where the explanation has to be.
    const prose = raw.replace(
      /<!-- BEGIN GENERATED: [\w-]+(?:\s+\w+=\S+)* -->[\s\S]*?<!-- END GENERATED: [\w-]+ -->/g, "")
    const missing = (inventory.notifications ?? [])
      .map(n => n.operation)
      // A null operation means the extractor could not resolve it — the page documents those by
      // resource instead, so there is no name to look for.
      .filter(op => op != null)
      .filter((op, i, all) => all.indexOf(op) === i)
      .filter(op => !prose.includes(`\`${op}\``))
    for (const op of missing) {
      fail("notifications.md", `operation \`${op}\` is in the code but not explained outside the generated blocks`)
    }
  }
}

// notification sections — an operation's prose section must agree with the part of the UI the
// generated "Raised by" column names. Writing a map operation into the Graph section has
// happened twice: once as the showAllCases / show all cases swap, and once with five
// data-display operations filed under Graph. Both times the generated column beside the prose
// already said otherwise, and nothing compared them.
{
  const page = join(docsDir, "notifications.md")
  if (existsSync(page)) {
    const raw = readFileSync(page, "utf8")
    // Which heading a section's rows belong under, mapped to the areas the generator reports.
    const sectionAreas = {
      "Graph": ["graph"],
      "Map": ["map"],
      "Data display": ["data display"],
      "Lifecycle": ["lifecycle", "container", "other"],
      "Case table and case card": ["case table", "case card"],
      "Text, calculator, formula": ["text", "calculator", "formula"]
    }
    const generated = new Map()
    const block = /<!-- BEGIN GENERATED: notifications-component -->([\s\S]*?)<!-- END GENERATED/.exec(raw)
    for (const line of block ? block[1].split("\n") : []) {
      const cells = line.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim())
      if (cells.length === 3 && cells[0].startsWith("`")) generated.set(cells[0].replace(/`/g, ""), cells[1])
    }
    let section = null
    for (const line of raw.split("\n")) {
      if (line.startsWith("### ")) { section = line.slice(4).trim(); continue }
      const st = line.trim()
      if (!section || !st.startsWith("|") || !st.endsWith("|")) continue
      const cells = st.replace(/^\||\|$/g, "").split("|").map(c => c.trim())
      if (cells.length !== 2) continue
      const allowed = sectionAreas[section]
      if (!allowed) continue
      for (const m of cells[0].matchAll(/`([^`]+)`/g)) {
        const area = generated.get(m[1])
        if (area && !allowed.includes(area)) {
          fail("notifications.md", `\`${m[1]}\` is documented under "${section}" but is raised by ${area}`)
        }
      }
    }
  }
}

// coverage — the same mapping the generator uses, so the two cannot disagree about which
// resources have a page. See coverage.mjs for how a page declares what it documents.
const pageFor = buildPageFor(join(docsDir, "resources"), inventory.resources)
const documented = new Set(pageFor.keys())
const undocumented = inventory.resources.filter(r => !documented.has(r.name)).map(r => r.name)

console.error(`Linted ${files.length} pages against ${inventory.counts.resources} resources ` +
              `(code @ ${inventory.verifiedAgainst})`)
if (undocumented.length) {
  console.error(`Undocumented resources: ${undocumented.length}\n  ${undocumented.join(", ")}`)
  if (strict) problems.push(`${undocumented.length} resources have no page (--strict)`)
}

if (problems.length) {
  console.error(`\nFAIL — ${problems.length} problem(s):`)
  for (const p of problems) console.error(`  ${p}`)
  process.exit(1)
}
console.error("OK — no problems found")
