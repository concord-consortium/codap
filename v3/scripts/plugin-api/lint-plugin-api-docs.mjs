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
//   scope-drift   the scope block is identical across pages that report the same scope
//   errors        every error string quoted in a page exists in the code
//   citations     no source file:line citations (external pages; conventions.md is exempt)
//   issue-ids     no internal issue-tracker ids
//   placeholders  no CODAP-internal %@ i18n notation
//   sections      each resource page has the required sections and a provenance header
//   coverage      every resource in the code has a page, or is knowingly undocumented
//
// Undocumented resources are expected while the migration is in progress, so coverage is
// reported but only fails with --strict.
//
// Usage: node lint-plugin-api-docs.mjs [--strict]
// Exit code 1 if any check fails.
//
import { readFileSync, readdirSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join, relative, normalize } from "node:path"
import { execFileSync } from "node:child_process"

const here = dirname(fileURLToPath(import.meta.url))
const v3Dir = join(here, "..", "..")
const docsDir = join(v3Dir, "doc", "plugin-api")
const strict = process.argv.includes("--strict")

const inventory = JSON.parse(
  execFileSync("node", [join(here, "extract-plugin-api.mjs")], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
)

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
      if (cols(lines[j]) !== want) fail(name, `line ${j + 1}: table row has ${cols(lines[j]) - 1} cells, header has ${want - 1}`)
    }
  }

  // markers
  const begins = [...raw.matchAll(/<!-- BEGIN GENERATED: ([\w-]+)/g)].map(m => m[1])
  const ends = [...raw.matchAll(/<!-- END GENERATED: ([\w-]+)/g)].map(m => m[1])
  if (begins.join() !== ends.join()) fail(name, `generated markers do not pair: [${begins}] vs [${ends}]`)
  if (new Set(begins).size !== begins.length) fail(name, `duplicate generated block names: [${begins}]`)

  // scope drift
  const scope = /<!-- BEGIN GENERATED: scope -->\n([\s\S]*?)\n<!-- END GENERATED: scope -->/.exec(raw)
  if (scope) {
    if (!scopeBlocks.has(scope[1])) scopeBlocks.set(scope[1], [])
    scopeBlocks.get(scope[1]).push(name)
  }

  // error strings quoted in prose must exist in the code
  if (!isConventions) {
    // Any backticked phrase that reads like an error message. Not anchored on trailing
    // punctuation: several real error strings have none ("Component not found"), and requiring
    // it silently skipped them.
    for (const m of raw.matchAll(/`([A-Z][^`\n]{6,120})`/g)) {
      const quoted = m[1]
      if (knownErrors.has(quoted)) continue
      // tolerate the generator's neutral placeholders and page-specific named ones
      const normalised = quoted.replace(/<[\w\d]+>/g, "%@")
      const matches = [...knownErrors].some(e => e.replace(/%@\d?/g, "%@") === normalised)
      if (!matches && /not found|not supported|required|Unsupported|Unable|Cannot|Invalid/i.test(quoted)) {
        fail(name, `quoted error string not found in code: "${quoted}"`)
      }
    }
  }

  // external-page hygiene
  if (!isConventions) {
    for (const m of outsideFences.matchAll(/`[\w-]+\.(?:ts|tsx):\d+/g)) fail(name, `source citation on an external page: ${m[0]}\``)
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

// scope blocks must be identical wherever they say the same thing
if (scopeBlocks.size > 3) {
  problems.push(`scope blocks: ${scopeBlocks.size} distinct variants; expected at most 3 (one per scope case)`)
}

// coverage
const documented = new Set()
for (const file of files.filter(f => relative(docsDir, f).startsWith("resources/"))) {
  const raw = readFileSync(file, "utf8")
  for (const r of inventory.resources) {
    if (new RegExp(`\`${r.name}\``).test(raw) || raw.startsWith(`# ${r.name}`)) documented.add(r.name)
  }
}
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
