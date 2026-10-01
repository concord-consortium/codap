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
//                    map to interfaces by name — few resources match a
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
//   --check  report only; write nothing.
//
// Exits 2 for NEW, REMOVED or CHANGED under --check, and in either mode for a stale baseline
// entry, a page whose markers are not well formed, or a block declaring a source= the inventory
// does not have. Exits 3 if the extractor could not produce an inventory.
//
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { markerProblems } from "./markers.mjs"
import { readInventory } from "./inventory.mjs"
import { dirname, join, relative } from "node:path"

const here = dirname(fileURLToPath(import.meta.url))
const v3Dir = join(here, "..", "..")
const docsDir = join(v3Dir, "doc", "plugin-api")
const resourcesDir = join(docsDir, "resources")
const inventoryPath = join(docsDir, "plugin-api-inventory.json")

const check = process.argv.includes("--check")

// Re-extract so the inventory is never stale relative to the code we are checking against.
function required(value, what) {
  if (value == null || (Array.isArray(value) && value.length === 0)) {
    console.error(`generate-plugin-api-docs: the inventory has no ${what}. Re-run the extractor; ` +
                  `rendering from an empty list would rewrite real documentation into emptiness.`)
    process.exit(3)
  }
  return value
}

const inventory = readInventory()

// From the inventory, which reads it from DIBaseHandler. A second hard-coded list here would
// silently drop an eighth action from every table and from the schema enum — exactly what the
// extractor refuses to do.
const ACTIONS = required(inventory.actions, "inventory.actions")
const tick = b => (b ? "✓" : "—")

// Order by code unit, never by locale: `localeCompare` follows the host's, so the same inventory
// renders a different catalog under e.g. LC_ALL=tr_TR and `--check` is then red forever there.
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

// --- which page documents which resource ---------------------------------------------------
// A page declares the resources it covers in its `actions` block header, which names one
// column per resource. That keeps the mapping in the page rather than in a side table.
const pages = readdirSync(resourcesDir).filter(f => f.endsWith(".md")).sort()
// Pages outside resources/ that also carry generated blocks.
const extraPages = ["quick-reference.md"].filter(f => existsSync(join(docsDir, f)))
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
  // The extractor records actions: null when it cannot resolve a handler. That is "unknown",
  // not "unsupported" — rendering it as — would publish a false negative.
  const cell = (r, a) => (r.actions == null ? "?" : tick(r.actions.includes(a)))
  if (found.length === 1) {
    return ["| Action | Supported |", "|---|---|",
      ...ACTIONS.map(a => `| \`${a}\` | ${cell(found[0], a)} |`)].join("\n")
  }
  const head = `| Action | ${found.map(r => r.name).join(" | ")} |`
  const rule = `|---|${found.map(() => "---").join("|")}|`
  const rows = ACTIONS.map(a => `| \`${a}\` | ${found.map(r => cell(r, a)).join(" | ")} |`)
  return [head, rule, ...rows].join("\n")
}

// Two independent signals decide this. The #default exemption list says whether the parser
// resolves a data context at all; `usesDataContext` says whether the handler reads one. A
// resource can have one resolved and ignore it, so reporting from the list alone is misleading.
function renderScope(resourceNames) {
  const found = resourceNames.map(n => inventory.resources.find(r => r.name === n)).filter(Boolean)
  // Refuse rather than guess: if a resource was renamed in code, or a page covers several and we
  // resolved only some, an assertion here would be fabricated. Leave the block for a human.
  if (!resourceNames.length || found.length !== resourceNames.length) return null
  const exempt = resourceNames.every(n => inventory.defaultContextExemptions.includes(n))
  const uses = found.some(r => r.usesDataContext)
  if (exempt) {
    return "This resource is **not** scoped to a data context, so the default-data-context rule does not\n" +
           "apply. Naming a `dataContext` in the selector has no effect."
  }
  if (!uses) {
    // Do not conclude "naming a dataContext has no effect" from the handler alone. The parser
    // resolves `collection` and `attribute` segments *within* the resolved data context, so for
    // attributeList the context fully determines the result even though its handler never reads
    // one. State the mechanism, which is true for both shapes, instead of a conclusion that is
    // true only when the selector has no segment resolved inside the context.
    return "This resource's handler does not read a data context itself. CODAP still resolves one —\n" +
           "defaulting to `#default` when the selector omits it — and uses it to resolve any\n" +
           "`collection` or `attribute` segment earlier in the selector. Naming a different\n" +
           "`dataContext` therefore changes what this resource returns only when the selector\n" +
           "contains such a segment."
  }
  return "This resource is scoped to a data context. Omitting one selects `#default`, the first data\n" +
         "context in the document — see [the index](../README.md#the-default-data-context)."
}

function renderAdornmentTypes() {
  const rows = inventory.adornmentTypes.map(a => {
    const aliases = a.aliases.map(x => `\`${x}\``).join(", ")
    const label = a.aliases.length ? `\`${a.type}\` (alias ${aliases})` : `\`${a.type}\``
    if (a.actions == null) return `| ${label} | ? | ? | ? | ? |`   // unresolved handler
    const has = x => a.actions.includes(x)
    return `| ${label} | ${tick(has("get"))} | ${tick(has("create"))} | ${tick(has("update"))} | ` +
           `${has("delete") ? "✓" : "hides"} |`
  })
  return ["| Type | get | create | update | delete |", "|---|---|---|---|---|", ...rows].join("\n")
}

function renderValues(sourceName) {
  const iface = inventory.valueTypes[sourceName]
  if (!iface) return null
  const esc = t => t.replace(/\|/g, "\|")   // many member types are unions; a bare pipe splits the row
  // Naming the interface each member came from lets a reader see where a property originates —
  // the V2 component shape, the V2 attribute shape, or the DI layer itself. The column appears
  // only when something is actually inherited, so flat interfaces keep a three-column table.
  const inherits = iface.members.some(m => m.inherited)
  const from = m => m.inherited ?? sourceName
  const rows = iface.members.map(m =>
    `| \`${m.name}\` | ${esc(m.type)} | ${m.optional ? "optional" : "required"} |` +
    (inherits ? ` \`${from(m)}\` |` : ""))
  const head = inherits ? "| Property | Type | | Declared in |" : "| Property | Type | |"
  const rule = inherits ? "|---|---|---|---|" : "|---|---|---|"
  return [head, rule, ...rows].join("\n")
}

// --- the quick-reference tables -------------------------------------------------
function renderResourceActions() {
  const head = `| Resource | ${ACTIONS.map(a => `\`${a}\``).join(" | ")} |`
  const rule = `|---|${ACTIONS.map(() => "---").join("|")}|`
  // `actions: null` means the handler could not be resolved, not that it supports nothing.
  // Rendering "—" there would publish "this action is unsupported" as a fact we do not have,
  // which is the same distinction renderActions already makes with "?".
  const rows = inventory.resources.map(r =>
    `| \`${r.name}\` | ${ACTIONS.map(a => (r.actions == null ? "?" : tick(r.actions.includes(a)))).join(" | ")} |`)
  return [head, rule, ...rows].join("\n")
}

function renderSelectorGrammar() {
  const resourceNames = inventory.resources.map(r => `\`${r.name}\``).join(", ")
  const exempt = inventory.defaultContextExemptions.map(k => `\`${k}\``).join(", ")
  return [
    "A resource selector is a dot-separated chain of segments. Each segment is a key, optionally",
    "followed by a name or id in square brackets:",
    "",
    "```",
    "selector  := segment ( \".\" segment )*",
    "segment   := key ( \"[\" nameOrId \"]\" )?",
    "key       := one or more word characters",
    "nameOrId  := a name, a title, or a numeric id — or #default for a data context",
    "```",
    "",
    "**Any word is accepted as a key at parse time.** CODAP does not validate keys against a list",
    "while parsing, so a misspelled selector never fails there.",
    "",
    "A misspelled **final** segment decides which handler runs, so there is none, and the request",
    "fails with `Unsupported action: <action>/<key>`.",
    "",
    "A misspelled **earlier** segment is simply unread: the parser stores it under a key nothing",
    "looks at, and resolution proceeds as though you had not written that segment at all. What",
    "that costs depends on which segment it was.",
    "",
    "- **A misspelled `dataContext`** is the dangerous one. With no data context named, CODAP",
    "  supplies `#default`, so the request runs against the first data context in the document and",
    "  reports success — against data you did not ask for.",
    "- **A misspelled `collection`** leaves the resource to resolve without one. For `attribute`",
    "  the search widens to the whole data context and usually finds the attribute anyway;",
    "  `attributeList` returns an empty list; the case resources report not found.",
    "",
    "Do not read a successful parse, or even a successful request, as a valid selector.",
    "",
    `**Keys that name a resource** (${inventory.resources.length}): ${resourceNames}.`,
    "",
    "Earlier segments narrow the target — `dataContext[Mammals].collection[Cases].attributeList`",
    "reads the attributes of one collection of one data context.",
    "",
    "**Data-context defaulting.** When a selector omits `dataContext`, CODAP supplies `#default`,",
    "which resolves to the first data context in the document. That does not apply to these",
    `resource types: ${exempt}. Nor does it apply when creating a data context, since there is`,
    "nothing to default to yet. Note that some resources have a data context resolved and ignore",
    "it; each resource's page says which."
  ].join("\n")
}

// CODAP's i18n notation (%@, %@1) means nothing to a plugin author, and the conventions forbid
// it on these pages. Substitute a neutral placeholder: the generator cannot know that %@1 is a
// type and %@2 an action — a resource page that knows may name them meaningfully in its own
// hand-written errors table.
const plainPlaceholders = msg => msg
  .replace(/%@(\d+)/g, "<value$1>")
  .replace(/%\{(\w+)\}/g, "<$1>")
  .replace(/%@/g, "<value>")

function renderErrorCatalog() {
  const rows = [...inventory.errors]
    .sort((a, b) => cmp(a.message, b.message))
    .map(e => `| \`${plainPlaceholders(e.message).replace(/\|/g, "\\|")}\` | ` +
              `${e.exportedAs ? `\`${e.exportedAs}\`` : "—"} |`)
  return ["| Error | Prebuilt result |", "|---|---|", ...rows].join("\n")
}

// --- rewrite ---------------------------------------------------------------------------------
// The body may be empty — a new page can declare a block and let the generator fill it.
const BLOCK = /<!-- BEGIN GENERATED: ([\w-]+)((?:\s+\w+=\S+)*) -->\n?([\s\S]*?)\n?<!-- END GENERATED: \1 -->/g
const report = { new: [], removed: [], changed: [], skipped: [], markers: [], badSource: [] }

for (const page of [...pages, ...extraPages]) {
  const path = pages.includes(page) ? join(resourcesDir, page) : join(docsDir, page)
  const before = readFileSync(path, "utf8")

  // Never rewrite a page whose markers are not provably well formed — see markers.mjs for what
  // a rewrite would otherwise destroy. Report and skip the page; the lint reports the same.
  const badMarkers = markerProblems(before)
  if (badMarkers.length) {
    for (const problem of badMarkers) report.markers.push(`${page}: ${problem}`)
    continue
  }

  const covered = [...pageFor].filter(([, p]) => p === page).map(([n]) => n)

  const after = before.replace(BLOCK, (whole, name, attrText, body) => {
    const attrs = Object.fromEntries([...attrText.matchAll(/(\w+)=(\S+)/g)].map(m => [m[1], m[2]]))
    let rendered = null
    if (name === "actions") rendered = renderActions(covered)
    else if (name === "scope") rendered = renderScope(covered)
    else if (name === "adornment-types") rendered = renderAdornmentTypes()
    else if (name === "resource-actions") rendered = renderResourceActions()
    else if (name === "selector-grammar") rendered = renderSelectorGrammar()
    else if (name === "error-catalog") rendered = renderErrorCatalog()
    else if (name.startsWith("values") && attrs.source) rendered = renderValues(attrs.source)

    if (rendered == null) {
      // A block that *declares* a source is a claim: that interface exists and the tool fills
      // this table from it. If it does not resolve, the claim is false — a renamed or deleted
      // interface leaving a frozen table behind — so that is a failure, not hand-maintenance.
      if (attrs.source) {
        report.badSource.push(`${page}: ${name} declares source=${attrs.source}, not in the inventory`)
      }
      else report.skipped.push(`${page}: ${name}`)
      return whole
    }
    if (rendered !== body) report.changed.push(`${page}: ${name}`)
    return `<!-- BEGIN GENERATED: ${name}${attrText} -->\n${rendered}\n<!-- END GENERATED: ${name} -->`
  })

  if (after !== before && !check) writeFileSync(path, after)
}

// --- JSON Schema for the request envelope --------------------------------------------
// Validates the envelope and the action vocabulary, and carries the resource -> supported
// actions map so a tool can check an action against its resource. It deliberately does not try
// to validate `values`: those shapes vary per resource and per action, and a schema that
// guessed them would reject valid requests.
function buildSchema() {
  // Only resources whose handler resolved. An unresolved one listed as [] would tell a tool that
  // every action is unsupported, which is a claim the extractor explicitly declined to make.
  const byResource = {}
  for (const r of inventory.resources) if (r.actions != null) byResource[r.name] = r.actions
  const unresolved = inventory.resources.filter(r => r.actions == null).map(r => r.name)
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://codap.concord.org/schemas/plugin-api-request.schema.json",
    title: "CODAP Data Interactive request",
    description:
      "Generated from v3/src by v3/scripts/plugin-api. Validates the request envelope a plugin " +
      "sends to CODAP. `values` is not yet validated: its shape varies by resource and action, " +
      "and the mapping from those to a value interface is not yet extracted. It is documented " +
      "per resource in v3/doc/plugin-api/resources/.",
    // A request is one action or a batch of them: DIRequest = DIAction | DIAction[].
    oneOf: [{ $ref: "#/$defs/action" }, { type: "array", items: { $ref: "#/$defs/action" }, minItems: 1 }],
    $defs: {
      action: {
  type: "object",
  required: ["action", "resource"],
  additionalProperties: false,
  properties: {
      action: { enum: ACTIONS, description: "The verb. Not every resource supports every action." },
      resource: {
        type: "string",
        minLength: 1,
        pattern: "^[A-Za-z#][A-Za-z0-9_#]*(\\[[^\\]]+\\])?(\\.[A-Za-z][A-Za-z0-9_]*(\\[[^\\]]+\\])?)*$",
        description: "A dot-separated selector chain; see doc/plugin-api/quick-reference.md."
      },
    values: { description: "Payload for create, update and notify. Shape varies by resource." }
  }
      },
      supportedActions: {
        description: "resource name -> the actions its handler implements. Data for tools; not " +
          "referenced by the validation above. Resources whose handler could not be resolved are " +
          "omitted rather than listed as supporting nothing" +
          (unresolved.length ? `: ${unresolved.join(", ")}.` : "."),
        const: byResource
      },
      // These are the members of DIResourceSelector, which is not the same set as the resource
      // keys a selector may use: it includes `type`, which the parser sets itself, and omits the
      // list-style resources. Named accordingly so no one validates against it.
      resourceSelectorMembers: {
        description: "Members of the internal DIResourceSelector type. Data for tools; NOT the " +
          "set of valid selector keys — see the resource table in doc/plugin-api/quick-reference.md.",
        const: inventory.selectorKeys
      }
    }
  }
}
// Both committed artifacts are written here, and compared in --check mode — otherwise they can
// drift from the code indefinitely with CI green.
const artifacts = [
  [join(docsDir, "plugin-api-request.schema.json"), JSON.stringify(buildSchema(), null, 2) + "\n"],
  // The inventory's verifiedAgainst records when it was regenerated, so compare everything else.
  [inventoryPath, JSON.stringify(inventory, null, 2) + "\n"]
]
// `source` fields carry file:line, so any edit anywhere above a registration shifts them and the
// byte comparison reports the artifact stale — a red advisory check caused by a blank line in an
// unrelated handler. The line numbers are useful to a human reading the inventory and useless to
// the comparison, so normalize them out of it along with verifiedAgainst.
const stripVolatile = t => t
  .replace(/"verifiedAgainst":\s*"[^"]*"/, '"verifiedAgainst":""')
  .replace(/("source":\s*"[^"]*?):\d+"/g, '$1"')
for (const [file, content] of artifacts) {
  if (check) {
    const current = existsSync(file) ? readFileSync(file, "utf8") : ""
    if (stripVolatile(current) !== stripVolatile(content)) {
      report.changed.push(`${relative(docsDir, file)} is stale — run npm run plugin-api:generate`)
    }
  } else {
    // Writing unconditionally churns verifiedAgainst on every run, so a regenerate that changed
    // nothing still shows up as a modified file in git.
    const current = existsSync(file) ? readFileSync(file, "utf8") : ""
    if (stripVolatile(current) !== stripVolatile(content)) writeFileSync(file, content)
  }
}

// --- drift ------------------------------------------------------------------------------------
// Resources known to be undocumented while resources still lack pages. Without this baseline
// the check would be red from the day it lands until every resource has a page, and a permanently red
// advisory check is worse than none — it trains people to ignore it. A resource that appears
// here has been *decided about*; one that appears in NEW has not.
const baselinePath = join(docsDir, "undocumented-baseline.txt")
const baseline = new Set(
  existsSync(baselinePath)
    ? readFileSync(baselinePath, "utf8").split("\n").map(l => l.replace(/#.*/, "").trim()).filter(Boolean)
    : []
)
const baselined = []
for (const r of inventory.resources) {
  if (pageFor.has(r.name)) continue
  if (baseline.has(r.name)) baselined.push(r.name)
  else report.new.push(r.name)
}
for (const [name] of pageFor) if (!inventory.resources.some(r => r.name === name)) report.removed.push(name)
const staleBaseline = [...baseline].filter(n => pageFor.has(n) || !inventory.resources.some(r => r.name === n))

const line = (label, arr) => console.error(`${label}: ${arr.length}${arr.length ? "\n  " + arr.join("\n  ") : ""}`)
console.error(`Inventory: ${inventory.counts.resources} resources, verified against ${inventory.verifiedAgainst}`)

// An interface whose base could not be found silently loses every inherited row, so say so.
// Nothing triggers this today; an `extends Omit<X, "y">` or a base declared outside src/ would.
{
  const unresolved = Object.entries(inventory.valueTypes)
    .filter(([, v]) => v.unresolvedBases?.length)
    .map(([n, v]) => `${n} -> ${v.unresolvedBases.join(", ")}`)
  if (unresolved.length) {
    console.error(`UNRESOLVED BASES (inherited properties are missing from these tables): ${unresolved.length}`)
    for (const u of unresolved) console.error(`  ${u}`)
  }
}
console.error(`Documented: ${pageFor.size} resources across ${pages.length} pages`)
line("CHANGED (blocks rewritten)", report.changed)
line("NEW (in code, undocumented, NOT baselined)", report.new)
console.error(`Known undocumented (baselined): ${baselined.length}`)
if (staleBaseline.length) line("STALE baseline entries (now documented or gone — remove them)", staleBaseline)
line("REMOVED (documented, not in code)", report.removed)
if (report.skipped.length) line("Hand-maintained (left alone)", report.skipped)
if (report.markers.length) line("MARKER PROBLEMS (page not rewritten)", report.markers)
if (report.badSource.length) line("UNRESOLVED source= (block left frozen)", report.badSource)

// Marker problems fail in both modes: in --check they are a defect, and in write mode they mean
// a page was deliberately skipped, so exiting 0 would report success for work not done.
if (report.markers.length || report.badSource.length) process.exit(2)
if (check && (report.changed.length || report.new.length || report.removed.length ||
              staleBaseline.length)) process.exit(2)
