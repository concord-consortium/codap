#!/usr/bin/env node
//
// generate-tester-templates.mjs
//
// Writes the request templates for the plugin API Tester (DataInteractiveAPITester in the
// codap-data-interactives repo) from the request examples in v3/doc/plugin-api/resources/.
//
// Every ```json block on a resource page whose `action` is one the inventory lists for its
// resource type becomes a template. That test is what separates a request a plugin sends from a
// notification CODAP sends, which the pages also show as json: `logMessageNotice` and
// `documentChangeNotice` are not resources, and `notify` on `global` is not an action a plugin
// can send. An array block becomes one template per element.
//
// Each template is named from the prose that introduces its example — the bold lead-in, or the
// first sentence of the paragraph before the block — and carries the URL of the section it came
// from. A lead that only makes sense beside its neighbors ("Read it.") gets the resource
// appended. An example that appears on more than one page is kept once, from its own resource's
// page where there is one.
//
// Templates with no counterpart in the reference live in the tester's own tests.json; this
// script does not touch that file.
//
// Usage: npm run plugin-api:tester         (assumes codap-data-interactives is cloned beside codap)
//        npm run plugin-api:tester:check   (exit 1 if the tester's copy is stale)
//        node generate-tester-templates.mjs --out <file> [--check]
//
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { buildPageFor, listPages } from "./coverage.mjs"
import { readInventory } from "./inventory.mjs"
import { headingsOf, maskFences } from "./markdown.mjs"

const here = dirname(fileURLToPath(import.meta.url))
const resourcesDir = join(here, "..", "..", "doc", "plugin-api", "resources")
const sourceBaseUrl =
  "https://github.com/concord-consortium/codap/blob/main/v3/doc/plugin-api/resources/"

const usage = "usage: generate-tester-templates.mjs --out <file> [--check]"
const args = process.argv.slice(2)
const outIndex = args.indexOf("--out")
const outPath = outIndex >= 0 ? args[outIndex + 1] : undefined
const check = args.includes("--check")
if (!outPath || outPath.startsWith("--")) {
  console.error(usage)
  process.exit(1)
}

const inventory = readInventory()
const actionsByType = new Map(inventory.resources.map(r => [r.name, new Set(r.actions)]))
const pageFor = buildPageFor(resourcesDir, inventory.resources)

// `dataContext[Mammals].collection[Cases].attribute[Height]` -> `attribute`
const resourceTypeOf = resource => resource.replace(/\[[^\]]*]/g, "").replace(/.*\./, "")

const kMaxNameLength = 80

// The text a template is named from: the bold lead-in of the paragraph, or its first sentence.
// Returns undefined for a paragraph that is not prose — a heading, a list, a table, code.
function leadOf(paragraph) {
  if (/^(#|- |\* |\d+\. |\||<!--|```)/.test(paragraph)) return undefined
  const text = paragraph.replace(/\s+/g, " ").trim()
  const bold = text.match(/^\*\*(.+?)\*\*/)
  let lead = bold ? bold[1] : text.match(/^(.+?)(?:[.:](?: |$)|$)/)[1]
  lead = lead.replace(/`/g, "").replace(/\[([^\]]*)]\([^)]*\)/g, "$1").replace(/[.:]$/, "").trim()
  if (lead.length > kMaxNameLength) {
    lead = lead.slice(0, kMaxNameLength - 1).replace(/\s+\S*$/, "") + "…"
  }
  return lead || undefined
}

// A lead with no content of its own: "Send".
const isBareLead = lead => !lead.includes(" ")

// A short lead that leans on the examples around it: "Read it", "Change one of its values".
function needsResource(lead) {
  const words = lead.split(" ")
  return words.length <= 5 && words.slice(0, 4).some(w => /^(it|its|them)$/i.test(w))
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1) }

function templatesFromPage(file) {
  const raw = readFileSync(join(resourcesDir, file), "utf8")
  // Paragraphs are found in the masked text, so a blank line inside a code block cannot split it.
  const masked = maskFences(raw)
  const headings = headingsOf(raw).filter(h => h.level >= 2)
  const found = []
  for (const block of raw.matchAll(/```json\n([\s\S]*?)```/g)) {
    let parsed
    try { parsed = JSON.parse(block[1]) } catch { continue }   // the lint reports these
    const requests = (Array.isArray(parsed) ? parsed : [parsed]).filter(request => {
      if (typeof request?.action !== "string" || typeof request.resource !== "string") return false
      return actionsByType.get(resourceTypeOf(request.resource))?.has(request.action) ?? false
    })
    if (!requests.length) continue

    // Walk back over any code blocks just before this one, so every block in a run that one
    // sentence introduces ("Set two cases aside, then restore everything...") shares its lead.
    const paragraphs = masked.slice(0, block.index).trimEnd().split(/\n{2,}/)
    let p = paragraphs.length - 1
    while (p >= 0 && paragraphs[p].trimStart().startsWith("```")) p--
    let lead = p >= 0 ? leadOf(paragraphs[p]) : undefined
    let hasBoldLead = p >= 0 && paragraphs[p].startsWith("**")
    // "**Get a PNG of a graph.**" then "Send:" — the bold lead-in above names the example.
    if (lead && isBareLead(lead) && p > 0 && paragraphs[p - 1].startsWith("**")) {
      lead = leadOf(paragraphs[p - 1])
      hasBoldLead = true
    }
    const heading = headings.filter(h => h.offset < block.index).pop()

    for (const request of requests) {
      found.push({
        lead,
        // a section heading names an example with no prose of its own, unless it is just "Examples"
        heading: heading && heading.text !== "Examples" ? heading.text.replace(/`/g, "") : undefined,
        group: `${file}:${p}`,
        request,
        source: `${sourceBaseUrl}${file}${heading ? `#${heading.anchor}` : ""}`,
        ownPage: pageFor.get(resourceTypeOf(request.resource)) === file,
        hasBoldLead
      })
    }
  }
  return found
}

const all = listPages(resourcesDir).flatMap(templatesFromPage)

// Keep one copy of a request that appears on several pages: its own page's, then one with a bold
// lead, then the first.
const rank = t => (t.ownPage ? 0 : 2) + (t.hasBoldLead ? 0 : 1)
const byMessage = new Map()
for (const t of all) {
  const key = JSON.stringify(t.request)
  const kept = byMessage.get(key)
  if (!kept || rank(t) < rank(kept)) byMessage.set(key, t)
}
const kept = all.filter(t => byMessage.get(JSON.stringify(t.request)) === t)

// Name each template, numbering those that still share a lead after deduplication:
// "(1 of 2)", "(2 of 2)".
const groups = new Map()
for (const t of kept) {
  if (!groups.has(t.group)) groups.set(t.group, [])
  groups.get(t.group).push(t)
}
for (const group of groups.values()) {
  group.forEach((t, i) => {
    const { action, resource } = t.request
    let name = t.lead ?? t.heading ?? `${capitalize(action)} ${resourceTypeOf(resource)}`
    if (t.lead && (isBareLead(t.lead) || needsResource(t.lead))) name = `${name} — ${resource}`
    if (group.length > 1) name = `${name} (${i + 1} of ${group.length})`
    t.name = name
  })
}
const templates = kept.map(({ name, request, source }) => ({ name, message: request, source }))

const output = JSON.stringify({
  $comment: "Generated by v3/scripts/plugin-api/generate-tester-templates.mjs in the codap " +
            "repo, from the request examples in v3/doc/plugin-api/resources/. Do not edit by " +
            "hand: change the reference and regenerate. Hand-made templates go in tests.json.",
  templates
}, null, 2) + "\n"

if (check) {
  const current = existsSync(outPath) ? readFileSync(outPath, "utf8") : ""
  if (current !== output) {
    console.error(`${outPath} is out of date with the reference; regenerate it with --out`)
    process.exit(1)
  }
  console.log(`${outPath} is up to date (${templates.length} templates)`)
} else {
  writeFileSync(outPath, output)
  console.log(`wrote ${templates.length} templates to ${outPath}`)
}
