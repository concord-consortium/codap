//
// tester-templates.mjs
//
// Builds the plugin API Tester's request templates from the request examples in
// v3/doc/plugin-api/resources/, and finds the problems that would leave a template out. Used by
// generate-tester-templates.mjs, which writes them, and by the lint, which reports the problems.
//
// Every ```json block on a resource page whose `action` is one the inventory lists for its
// resource type becomes a template. That test is what separates a request a plugin sends from a
// notification CODAP sends, which the pages also show as json: `logMessageNotice` and
// `documentChangeNotice` are not resources, and `notify` on `document` or `global` is not an
// action a plugin can send. An array block becomes one template per element.
//
// Problems: an example with only one of `action` and `resource`, or one that isn't a string; an
// example whose resource type or action the inventory doesn't list, other than the notices CODAP
// sends (so a typo such as `atribute[Notes]` can't drop a template unnoticed); and a documented
// resource's action that no example covers.
//
// Each template is named from the prose that introduces its example — the bold lead-in, or the
// first sentence of the paragraph before the block — and carries the URL of the section it came
// from. A lead that only makes sense beside its neighbors ("Read it.") gets the resource
// appended. An example that appears on more than one page is kept once, from its own resource's
// page where there is one.
//
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { buildPageFor, listPages } from "./coverage.mjs"
import { headingsOf, jsonBlocksOf, maskFences } from "./markdown.mjs"

const sourceBaseUrl =
  "https://github.com/concord-consortium/codap/blob/main/v3/doc/plugin-api/resources/"

// `dataContext[Mammals].collection[Cases].attribute[Height]` -> `attribute`
const resourceTypeOf = resource => resource.replace(/\[[^\]]*]/g, "").replace(/.*\./, "")

// Notifications CODAP sends, which the pages show as json but a plugin can't send
const kCodapSentNotices = new Set(["documentChangeNotice", "logMessageNotice", "document", "global"])
const isCodapSentNotice = request =>
  request.action === "notify" && kCodapSentNotices.has(resourceTypeOf(request.resource))

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

function templatesFromPage(file, { resourcesDir, actionsByType, pageFor, problems }) {
  const raw = readFileSync(join(resourcesDir, file), "utf8")
  // Paragraphs are found in the masked text, so a blank line inside a code block cannot split it.
  const masked = maskFences(raw)
  const headings = headingsOf(raw).filter(h => h.level >= 2)
  const found = []
  for (const block of jsonBlocksOf(raw)) {
    let parsed
    try { parsed = JSON.parse(block.body) } catch { continue }   // the lint reports these
    const requests = (Array.isArray(parsed) ? parsed : [parsed]).filter(request => {
      const hasAction = request?.action !== undefined, hasResource = request?.resource !== undefined
      // a response, an item or other value shape: neither key
      if (!hasAction && !hasResource) return false
      if (typeof request.action !== "string" || typeof request.resource !== "string") {
        problems.push({ file, message: `example with action ${JSON.stringify(request.action)} and resource ` +
                        `${JSON.stringify(request.resource)} needs a string \`action\` and a string \`resource\`` })
        return false
      }
      if (actionsByType.get(resourceTypeOf(request.resource))?.has(request.action)) return true
      if (!isCodapSentNotice(request)) {
        problems.push({ file, message: `${request.action} ${request.resource} is not a resource and action the ` +
                        "inventory lists; fix the example, or add its resource type to kCodapSentNotices in " +
                        "tester-templates.mjs" })
      }
      return false
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

// The templates, and the problems ({ file, message }) that would leave one out.
export function buildTesterTemplates(resourcesDir, inventory) {
  const context = {
    resourcesDir,
    actionsByType: new Map(inventory.resources.map(r => [r.name, new Set(r.actions)])),
    pageFor: buildPageFor(resourcesDir, inventory.resources),
    problems: []
  }
  const { pageFor, problems } = context
  const all = listPages(resourcesDir).flatMap(file => templatesFromPage(file, context))

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

  // Every documented resource's actions have a template. Undocumented resources (no page) are left out.
  for (const { name: type, actions } of inventory.resources) {
    if (!pageFor.get(type)) continue
    for (const action of actions) {
      const covered = templates.some(({ message }) =>
        message.action === action && resourceTypeOf(message.resource) === type)
      if (!covered) problems.push({ file: pageFor.get(type), message: `no example of ${action} ${type}` })
    }
  }

  return { templates, problems }
}
