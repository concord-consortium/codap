#!/usr/bin/env node
//
// extract-plugin-api.mjs
//
// Deterministic extractor for the CODAP v3 Data Interactive (plugin) API. Parses every
// non-test source file under v3/src with the TypeScript compiler API and emits a JSON
// inventory of the API surface a plugin can address.
//
// What it captures:
//   - resources        registerDIHandler("name", handler) -> the actions the handler defines
//   - componentTypes   registerComponentHandler(kV2XType, ...) -> creatable DI component types
//   - adornmentTypes   registerAdornmentHandler(kXType, handler, alias?) -> types, aliases,
//                      and which of get/create/update/delete each supports
//   - errors           V3.DI.Error.* strings from en-US.json5, cross-referenced with the
//                      prebuilt results exported by handlers/di-results.ts
//   - selectorKeys     the members of DIResourceSelector
//   - defaultContext   the resource types exempt from #default data-context defaulting
//   - valueTypes       exported interfaces in the data-interactive-*-types.ts files
//
// What it does NOT capture, by design. These require judgment and stay hand-written in the
// reference (see v3/doc/plugin-api/conventions.md):
//   - why a resource exists, or when a plugin would reach for it
//   - the condition that produces an error (only the string is derivable)
//   - worked examples
//   - per-adornment measure-data shapes, which are assembled at runtime by each handler's
//     getAdditionalData
//
// Output: a JSON object on stdout. Use --pretty for indented output.
//
// Usage (from anywhere): node extract-plugin-api.mjs [--pretty]
//
import { readFileSync, readdirSync, statSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join, relative } from "node:path"
import { createRequire } from "node:module"
import { execFileSync } from "node:child_process"

const here = dirname(fileURLToPath(import.meta.url))
// This script lives at <repo>/v3/scripts/plugin-api/
const v3Dir = join(here, "..", "..")
const repoRoot = join(v3Dir, "..")
const srcDir = join(v3Dir, "src")

// Resolve the repo's own TypeScript (anchored at v3/package.json) regardless of cwd.
const require = createRequire(join(v3Dir, "package.json"))
const ts = require("typescript")

const ACTIONS = ["get", "create", "update", "delete", "notify", "register", "unregister"]

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) out.push(p)
  }
  return out
}

const files = walk(srcDir).sort()
const rel = p => relative(v3Dir, p).replace(/\\/g, "/")

// Parse once; every pass below reads these.
const sources = new Map()
for (const file of files) {
  sources.set(file, ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true))
}

const lineOf = (sf, node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
const siteOf = (sf, node) => `${rel(sf.fileName)}:${lineOf(sf, node)}`

function eachNode(sf, visit) {
  const walkNode = node => { visit(node); ts.forEachChild(node, walkNode) }
  walkNode(sf)
}

// --- pass 1: every `const X = "literal"`, so we can resolve kV2GraphType -> "graph" -------
const stringConsts = new Map()
for (const [, sf] of sources) {
  eachNode(sf, node => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer &&
        ts.isStringLiteralLike(node.initializer)) {
      if (!stringConsts.has(node.name.text)) stringConsts.set(node.name.text, node.initializer.text)
    }
  })
}

// Resolve an argument node to a string when we can: a literal, or a const we indexed.
function asString(node) {
  if (!node) return undefined
  if (ts.isStringLiteralLike(node)) return node.text
  if (ts.isIdentifier(node)) return stringConsts.get(node.text)
  return undefined
}

// --- pass 2: index every `const X = <object literal>` so handlers can be resolved ---------
// Handlers are declared as `export const diXHandler: DIHandler = { get() {...}, ... }` in the
// same file as their registration. A few are produced by a factory call instead; those are
// recorded with the factory name so the caller can see why actions are unknown.
const objectConsts = new Map()  // name -> { props: Set, factory?: string, site }
for (const [, sf] of sources) {
  eachNode(sf, node => {
    if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || !node.initializer) return
    const name = node.name.text
    if (objectConsts.has(name)) return
    const init = node.initializer
    if (ts.isObjectLiteralExpression(init)) {
      const props = new Set()
      for (const m of init.properties) {
        const n = m.name && (ts.isIdentifier(m.name) || ts.isStringLiteralLike(m.name)) ? m.name.text : undefined
        if (n) props.add(n)
      }
      objectConsts.set(name, { props, site: siteOf(sf, node) })
    } else if (ts.isCallExpression(init) && ts.isIdentifier(init.expression)) {
      objectConsts.set(name, { props: null, factory: init.expression.text, site: siteOf(sf, node) })
    }
  })
}

// --- pass 2b: factories that return a handler ----------------------------------------------
// Several adornments share a handler built by a factory — univariateMeasureAdornmentBaseHandler
// is the notable one, and it is the shape Phase 3 will meet again. Index the properties of the
// object literal such a factory returns so those handlers resolve like any other.
const factoryProps = new Map()  // function name -> Set of property names
for (const [, sf] of sources) {
  eachNode(sf, node => {
    const isFn = ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)
    if (!isFn || !node.body) return
    // Name it: `function f() {}`, or `const f = (...) => {}`
    let name
    if (ts.isFunctionDeclaration(node) && node.name) name = node.name.text
    else if (ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) name = node.parent.name.text
    if (!name || factoryProps.has(name)) return

    // An arrow with an expression body, or any `return { ... }` in the body.
    let literal
    if (!ts.isBlock(node.body) && ts.isObjectLiteralExpression(node.body)) literal = node.body
    else if (ts.isBlock(node.body)) {
      eachNode(node.body, n => {
        if (!literal && ts.isReturnStatement(n) && n.expression &&
            ts.isObjectLiteralExpression(n.expression)) literal = n.expression
      })
    }
    if (!literal) return
    const props = new Set()
    for (const m of literal.properties) {
      const n = m.name && (ts.isIdentifier(m.name) || ts.isStringLiteralLike(m.name)) ? m.name.text : undefined
      if (n) props.add(n)
    }
    factoryProps.set(name, props)
  })
}

// Actions a handler object defines. Resolves one level of factory indirection; anything
// deeper is reported rather than guessed.
function actionsOf(identName) {
  const entry = objectConsts.get(identName)
  if (!entry) return { actions: null, note: "handler not found" }
  if (entry.props) return { actions: ACTIONS.filter(a => entry.props.has(a)) }
  const viaFactory = factoryProps.get(entry.factory)
  if (viaFactory) return { actions: ACTIONS.filter(a => viaFactory.has(a)), via: `${entry.factory}()` }
  return { actions: null, note: `built by ${entry.factory}()` }
}

// --- pass 3: registrations ----------------------------------------------------------------
const resources = []
const componentTypes = []
const adornmentTypes = []

for (const [, sf] of sources) {
  // A file gated behind a URL parameter registers only in that mode; note it rather than
  // pretending the registration is unconditional (e.g. the errorTester component).
  const gated = /\burlParams\.(\w+)/.exec(sf.getFullText())?.[1]

  eachNode(sf, node => {
    if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) return
    const fn = node.expression.text
    const [a0, a1, a2] = node.arguments

    if (fn === "registerDIHandler") {
      const name = asString(a0)
      if (!name) return
      const handlerName = a1 && ts.isIdentifier(a1) ? a1.text : undefined
      const { actions, note, via } = handlerName ? actionsOf(handlerName) : { actions: null, note: "inline handler" }
      resources.push({ name, actions, ...(note && { note }), ...(via && { via }), handler: handlerName,
                       source: siteOf(sf, node) })
    }

    if (fn === "registerComponentHandler") {
      const diType = asString(a0)
      if (!diType) return
      componentTypes.push({ diType, ...(gated && { gatedBy: `urlParams.${gated}` }), source: siteOf(sf, node) })
    }

    if (fn === "registerAdornmentHandler") {
      const type = asString(a0)
      if (!type) return
      const handlerName = a1 && ts.isIdentifier(a1) ? a1.text : undefined
      const { actions, note, via } = handlerName ? actionsOf(handlerName) : { actions: null, note: "inline handler" }
      const aliases = []
      const explicit = asString(a2)
      if (explicit) aliases.push(explicit)
      // registerAdornmentHandler also registers a space-free alias for any type with spaces.
      const trimmed = type.replace(/\s/g, "")
      if (trimmed !== type) aliases.push(trimmed)
      adornmentTypes.push({ type, aliases, actions, ...(note && { note }), ...(via && { via }),
                            source: siteOf(sf, node) })
    }
  })
}

// --- pass 4: DIResourceSelector members, and the #default exemption list ------------------
let selectorKeys = []
let defaultContextExemptions = []
for (const [, sf] of sources) {
  eachNode(sf, node => {
    if (ts.isInterfaceDeclaration(node) && node.name.text === "DIResourceSelector") {
      selectorKeys = node.members
        .filter(m => m.name && ts.isIdentifier(m.name))
        .map(m => m.name.text)
        .sort()
    }
  })
  // The exemption list is the array literal tested with .indexOf(resourceSelector.type) < 0
  if (rel(sf.fileName).endsWith("data-interactive/resource-parser.ts")) {
    eachNode(sf, node => {
      if (ts.isArrayLiteralExpression(node) &&
          node.elements.length > 5 &&
          node.elements.every(e => ts.isStringLiteralLike(e)) &&
          node.elements.some(e => e.text === "interactiveFrame")) {
        defaultContextExemptions = node.elements.map(e => e.text).sort()
      }
    })
  }
}

// --- pass 5: errors -----------------------------------------------------------------------
// The message strings live in en-US.json5; di-results.ts names the prebuilt results. JSON5
// allows trailing commas and unquoted keys, so scrape the V3.DI.Error lines rather than parse.
const langFile = join(srcDir, "utilities", "translation", "lang", "en-US.json5")
const errors = []
for (const line of readFileSync(langFile, "utf8").split("\n")) {
  const m = /"(V3\.DI\.Error\.[\w.]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(line)
  if (m) errors.push({ key: m[1], message: m[2].replace(/\\"/g, '"') })
}
// Which of those have a prebuilt result exported from di-results.ts.
const diResults = sources.get(join(srcDir, "data-interactive", "handlers", "di-results.ts"))
if (diResults) {
  eachNode(diResults, node => {
    if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || !node.initializer) return
    if (!ts.isCallExpression(node.initializer)) return
    const text = node.initializer.getText(diResults)
    const key = /V3\.DI\.Error\.[\w.]+/.exec(text)?.[0]
    if (!key) return
    const err = errors.find(e => e.key === key)
    if (err) err.exportedAs = node.name.text
  })
}
errors.sort((a, b) => a.key.localeCompare(b.key))

// --- pass 6: value/result type shapes -----------------------------------------------------
// The interfaces a plugin actually sends and receives. Members carry their declared type text
// and optionality; anything richer (defaults, semantics) is judgment and stays hand-written.
const valueTypes = {}
for (const [file, sf] of sources) {
  if (!/data-interactive\/data-interactive[\w-]*types\.ts$/.test(rel(file))) continue
  eachNode(sf, node => {
    if (!ts.isInterfaceDeclaration(node)) return
    const members = node.members
      .filter(m => ts.isPropertySignature(m) && m.name && (ts.isIdentifier(m.name) || ts.isStringLiteralLike(m.name)))
      .map(m => ({
        name: m.name.text,
        type: m.type ? m.type.getText(sf).replace(/\s+/g, " ") : "unknown",
        optional: !!m.questionToken
      }))
    if (members.length) valueTypes[node.name.text] = { members, source: siteOf(sf, node) }
  })
}
// --- provenance ---------------------------------------------------------------------------
let commit
try {
  commit = execFileSync("git", ["-C", repoRoot, "rev-parse", "--short=9", "HEAD"], { encoding: "utf8" }).trim()
} catch { commit = "unknown" }

const inventory = {
  $comment: "Generated by v3/scripts/plugin-api/extract-plugin-api.mjs. Do not edit by hand.",
  verifiedAgainst: commit,
  counts: {
    resources: resources.length,
    componentTypes: componentTypes.length,
    adornmentTypes: adornmentTypes.length,
    errors: errors.length
  },
  resources: resources.sort((a, b) => a.name.localeCompare(b.name)),
  componentTypes: componentTypes.sort((a, b) => a.diType.localeCompare(b.diType)),
  adornmentTypes: adornmentTypes.sort((a, b) => a.type.localeCompare(b.type)),
  selectorKeys,
  defaultContextExemptions,
  errors,
  valueTypes
}

const pretty = process.argv.includes("--pretty")
process.stdout.write(JSON.stringify(inventory, null, pretty ? 2 : 0) + "\n")
