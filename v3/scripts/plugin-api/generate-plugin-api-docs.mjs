#!/usr/bin/env node
//
// generate-plugin-api-docs.mjs
//
// Rewrites the generated blocks in v3/doc/plugin-api/ from the extractor's inventory, and
// reports drift between the documented reference and the code.
//
// Generated blocks are delimited by
//   <!-- BEGIN GENERATED: <name> -->  ...  <!-- END GENERATED: <name> -->
// and everything outside them is left untouched (see doc/plugin-api/conventions.md).
//
// Which blocks this tool writes, and why not the others:
//
//   actions          written. Derived from the actions each handler defines.
//   scope            written. Derived from two signals: the #default exemption list (does the
//                    parser resolve a data context at all?) and whether the handler reads one.
//                    The list alone is not enough — adornment has one resolved and ignores it.
//   adornment-types  written. Derived from the adornment registrations.
//   values           written ONLY when the block declares its source interface, as
//                    `<!-- BEGIN GENERATED: values source=DIAttribute -->`. Resources do not
//                    map to interfaces by name — only 2 of 7 sampled resources matched a
//                    DI<Name> convention — so the author states the mapping and the tool
//                    fills the table.
//   anything else    left alone and reported. A block this tool cannot produce completely is
//                    better hand-written than half-generated; the lint checks those instead.
//
// Drift is reported as:
//   NEW      a resource in the code with no page documenting it
//   REMOVED  a page for a resource the code no longer registers
//   CHANGED  a page whose actions block disagreed with the code (rewritten)
//
// Usage: node generate-plugin-api-docs.mjs [--check]
//   --check  report only; write nothing. Exits 2 if anything is NEW, REMOVED or CHANGED.
//
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join, relative } from "node:path"
import { execFileSync } from "node:child_process"

const here = dirname(fileURLToPath(import.meta.url))
const v3Dir = join(here, "..", "..")
const docsDir = join(v3Dir, "doc", "plugin-api")
const resourcesDir = join(docsDir, "resources")
const inventoryPath = join(docsDir, "plugin-api.json")

const check = process.argv.includes("--check")

// Re-extract so the inventory is never stale relative to the code we are checking against.
const inventory = JSON.parse(
  execFileSync("node", [join(here, "extract-plugin-api.mjs")], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
)

const ACTIONS = ["get", "create", "update", "delete", "notify", "register", "unregister"]
const tick = b => (b ? "✓" : "—")

// --- which page documents which resource ---------------------------------------------------
// A page declares the resources it covers in its `actions` block header, which names one
// column per resource. That keeps the mapping in the page rather than in a side table.
const pages = readdirSync(resourcesDir).filter(f => f.endsWith(".md")).sort()
const pageFor = new Map()   // resource name -> page filename
for (const page of pages) {
  const text = readFileSync(join(resourcesDir, page), "utf8")
  const header = /<!-- BEGIN GENERATED: actions -->\n\|([^\n]*)\|/.exec(text)
  const cols = header ? header[1].split("|").map(s => s.trim()).filter(Boolean) : []
  // First column is "Action"; the rest name resources, or say "Supported" for a single one.
  const named = cols.slice(1).filter(c => c !== "Supported")
  const covered = named.length ? named : [page.replace(/\.md$/, "")]
  for (const c of covered) pageFor.set(c.replace(/`/g, ""), page)
}
// Single-resource pages name the resource by filename in kebab-case; map it back.
const kebabToName = new Map(inventory.resources.map(r =>
  [r.name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), r.name]))
for (const [key, page] of [...pageFor]) {
  if (!inventory.resources.some(r => r.name === key) && kebabToName.has(key)) {
    pageFor.delete(key)
    pageFor.set(kebabToName.get(key), page)
  }
}

// --- block renderers ------------------------------------------------------------------------
function renderActions(resourceNames) {
  const found = resourceNames.map(n => inventory.resources.find(r => r.name === n)).filter(Boolean)
  if (!found.length) return null
  if (found.length === 1) {
    return ["| Action | Supported |", "|---|---|",
      ...ACTIONS.map(a => `| \`${a}\` | ${tick(found[0].actions?.includes(a))} |`)].join("\n")
  }
  const head = `| Action | ${found.map(r => r.name).join(" | ")} |`
  const rule = `|---|${found.map(() => "---").join("|")}|`
  const rows = ACTIONS.map(a => `| \`${a}\` | ${found.map(r => tick(r.actions?.includes(a))).join(" | ")} |`)
  return [head, rule, ...rows].join("\n")
}

// Two independent signals decide this. The #default exemption list says whether the parser
// resolves a data context at all; `usesDataContext` says whether the handler reads one. A
// resource can have one resolved and ignore it, so reporting from the list alone is misleading.
function renderScope(resourceNames) {
  const found = resourceNames.map(n => inventory.resources.find(r => r.name === n)).filter(Boolean)
  const exempt = resourceNames.every(n => inventory.defaultContextExemptions.includes(n))
  const uses = found.some(r => r.usesDataContext)
  if (exempt) {
    return "This resource is **not** scoped to a data context, so the default-data-context rule does not\n" +
           "apply. Naming a `dataContext` in the selector has no effect."
  }
  if (!uses) {
    return "This resource does not use a data context. CODAP still resolves one — defaulting to\n" +
           "`#default` when the selector omits it — but this resource ignores it, so naming a\n" +
           "`dataContext` has no effect."
  }
  return "This resource is scoped to a data context. Omitting one selects `#default`, the first data\n" +
         "context in the document — see [the index](../README.md#the-default-data-context)."
}

function renderAdornmentTypes() {
  const rows = inventory.adornmentTypes.map(a => {
    const label = a.aliases.length ? `\`${a.type}\` (alias ${a.aliases.map(x => `\`${x}\``).join(", ")})` : `\`${a.type}\``
    const has = x => a.actions?.includes(x)
    return `| ${label} | ${tick(has("get"))} | ${tick(has("create"))} | ${tick(has("update"))} | ` +
           `${has("delete") ? "✓" : "hides"} |`
  })
  return ["| Type | get | create | update | delete |", "|---|---|---|---|---|", ...rows].join("\n")
}

function renderValues(sourceName) {
  const iface = inventory.valueTypes[sourceName]
  if (!iface) return null
  const rows = iface.members.map(m => `| \`${m.name}\` | ${m.type} | ${m.optional ? "optional" : "required"} |`)
  return ["| Property | Type | |", "|---|---|---|", ...rows].join("\n")
}

// --- rewrite ---------------------------------------------------------------------------------
const BLOCK = /<!-- BEGIN GENERATED: ([\w-]+)((?:\s+\w+=\S+)*) -->\n([\s\S]*?)\n<!-- END GENERATED: \1 -->/g
const report = { new: [], removed: [], changed: [], skipped: [] }

for (const page of pages) {
  const path = join(resourcesDir, page)
  const before = readFileSync(path, "utf8")
  const covered = [...pageFor].filter(([, p]) => p === page).map(([n]) => n)

  const after = before.replace(BLOCK, (whole, name, attrText, body) => {
    const attrs = Object.fromEntries([...attrText.matchAll(/(\w+)=(\S+)/g)].map(m => [m[1], m[2]]))
    let rendered = null
    if (name === "actions") rendered = renderActions(covered)
    else if (name === "scope") rendered = renderScope(covered)
    else if (name === "adornment-types") rendered = renderAdornmentTypes()
    else if (name.startsWith("values") && attrs.source) rendered = renderValues(attrs.source)

    if (rendered == null) {
      report.skipped.push(`${page}: ${name}${attrs.source ? ` (source=${attrs.source} not found)` : ""}`)
      return whole
    }
    if (rendered !== body) report.changed.push(`${page}: ${name}`)
    return `<!-- BEGIN GENERATED: ${name}${attrText} -->\n${rendered}\n<!-- END GENERATED: ${name} -->`
  })

  if (after !== before && !check) writeFileSync(path, after)
}

// --- drift ------------------------------------------------------------------------------------
for (const r of inventory.resources) if (!pageFor.has(r.name)) report.new.push(r.name)
for (const [name] of pageFor) if (!inventory.resources.some(r => r.name === name)) report.removed.push(name)

const line = (label, arr) => console.error(`${label}: ${arr.length}${arr.length ? "\n  " + arr.join("\n  ") : ""}`)
console.error(`Inventory: ${inventory.counts.resources} resources, verified against ${inventory.verifiedAgainst}`)
console.error(`Documented: ${pageFor.size} resources across ${pages.length} pages`)
line("CHANGED (blocks rewritten)", report.changed)
line("NEW (in code, undocumented)", report.new)
line("REMOVED (documented, not in code)", report.removed)
if (report.skipped.length) line("Hand-maintained (left alone)", report.skipped)

if (check && (report.changed.length || report.new.length || report.removed.length)) process.exit(2)
