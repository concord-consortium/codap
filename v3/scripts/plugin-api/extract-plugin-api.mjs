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
//   - defaultContextExemptions  the resource types exempt from #default data-context defaulting
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

// The action vocabulary comes from DIBaseHandler, not a hardcoded list: an eighth action must
// not be silently dropped by the very tool meant to catch that drift. Filled in after parsing.
let ACTIONS = []

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

// Order by code unit, not by locale. `localeCompare` with no locale follows the host's, so the
// same source sorts differently under e.g. LC_ALL=tr_TR and `--check` then reports the committed
// artifact stale forever on that machine.
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

// An anti-drift tool must not publish confident emptiness. Anything the generator relies on is
// required: if a shape heuristic stops matching because the source was reformatted or renamed,
// fail here rather than emit "Valid keys (0)" or rewrite every scope block from an empty list.
function required(value, what) {
  const empty = value == null || (Array.isArray(value) && value.length === 0) ||
                (value instanceof Map && value.size === 0) ||
                (value.constructor === Object && Object.keys(value).length === 0)
  if (empty) {
    console.error(`extract-plugin-api: could not extract ${what}. The source shape this relies on ` +
                  `has probably changed; fix the extractor rather than publishing an empty result.`)
    process.exit(3)
  }
  return value
}

// --- pass 0: the action vocabulary, from DIBaseHandler ------------------------------------
for (const [, sf] of sources) {
  eachNode(sf, node => {
    if (ts.isInterfaceDeclaration(node) && node.name.text === "DIBaseHandler") {
      ACTIONS = node.members.filter(m => m.name && ts.isIdentifier(m.name)).map(m => m.name.text)
    }
  })
}
required(ACTIONS, "the action vocabulary (interface DIBaseHandler)")

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
// is the notable one, and it is a shape that recurs wherever a factory builds handlers. Index the properties of the
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
      // Only return statements belonging to *this* function. Recursing would let an inner
      // callback's object literal be recorded as the factory's handler.
      const enclosingFn = n => {
        for (let p = n.parent; p; p = p.parent) {
          if (ts.isFunctionDeclaration(p) || ts.isArrowFunction(p) || ts.isFunctionExpression(p) ||
              ts.isMethodDeclaration(p)) return p
        }
      }
      eachNode(node.body, n => {
        if (literal || !ts.isReturnStatement(n) || !n.expression) return
        if (!ts.isObjectLiteralExpression(n.expression)) return
        if (enclosingFn(n) === node) literal = n.expression
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

// Does this handler read a data context? Its own file may never mention one and still require
// it: case-by-id-handler.ts delegates to handler-functions.ts, whose exported functions begin
// `const { dataContext } = resources`. So follow only the functions this file actually calls,
// and test those function bodies — following every import instead would mark adornment as
// data-context scoped merely because a module it imports mentions the word.
function bodiesOfCalledImports(sf) {
  const called = new Set()
  eachNode(sf, n => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) called.add(n.expression.text)
  })
  const bodies = []
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteralLike(stmt.moduleSpecifier)) continue
    const spec = stmt.moduleSpecifier.text
    if (!spec.startsWith(".")) continue
    const names = stmt.importClause?.namedBindings
    if (!names || !ts.isNamedImports(names)) continue
    const wanted = names.elements.map(e => e.name.text).filter(n => called.has(n))
    if (!wanted.length) continue
    const base = join(dirname(sf.fileName), spec)
    const target = [`${base}.ts`, `${base}.tsx`, join(base, "index.ts")].find(f => sources.has(f))
    if (!target) continue
    const tsf = sources.get(target)
    eachNode(tsf, n => {
      const name = ts.isFunctionDeclaration(n) && n.name ? n.name.text
        : (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer &&
           (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))) ? n.name.text
        : undefined
      if (name && wanted.includes(name)) bodies.push(n.getText(tsf))
    })
  }
  return bodies
}

const dcCache = new Map()
function referencesDataContext(sf) {
  if (dcCache.has(sf.fileName)) return dcCache.get(sf.fileName)
  const own = /\bdataContext\b/.test(sf.getFullText())
  const viaCalls = !own && bodiesOfCalledImports(sf).some(b => /\bdataContext\b/.test(b))
  const result = own || viaCalls
  dcCache.set(sf.fileName, result)
  return result
}

// --- pass 3: registrations ----------------------------------------------------------------
const resources = []
const componentTypes = []
const adornmentTypes = []

// Is this call inside `if (urlParams.x)`? Checked per registration: one file registers four
// component types, and a stray urlParams reference must not mark them all conditional.
function gatedBy(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isIfStatement(p)) {
      const m = /\burlParams\.(\w+)/.exec(p.expression.getText())
      if (m) return `urlParams.${m[1]}`
    }
  }
}

// A registration call whose name is not a literal never enters the inventory, so it can never be
// reported as NEW — the single case this tool exists to catch. Fail loudly instead of returning.
function registrationName(value, fn, sf, node) {
  if (value) return value
  console.error(`extract-plugin-api: ${fn} at ${siteOf(sf, node)} does not name its resource with ` +
                `a string literal, so it cannot be inventoried. Teach the extractor to resolve it ` +
                `rather than letting a registered handler go unnoticed.`)
  process.exit(3)
}

for (const [, sf] of sources) {
  eachNode(sf, node => {
    if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) return
    const fn = node.expression.text
    const [a0, a1, a2] = node.arguments

    if (fn === "registerDIHandler") {
      const name = registrationName(asString(a0), fn, sf, node)
      const handlerName = a1 && ts.isIdentifier(a1) ? a1.text : undefined
      const { actions, note, via } = handlerName ? actionsOf(handlerName) : { actions: null, note: "inline handler" }
      // Whether the handler actually reads a data context. The parser's #default exemption list
      // says only whether one gets *resolved*; several resources have one resolved and ignore it
      // (adornment, for instance), so a page that reports scope from the list alone misleads.
      // Whether the handler actually reads a data context. A whole-file grep is not enough:
      // case-by-id-handler.ts never mentions dataContext but delegates to handler-functions.ts,
      // which requires one. Follow local imports one level before concluding it does not.
      const usesDataContext = referencesDataContext(sf)
      resources.push({ name, actions, ...(note && { note }), ...(via && { via }), handler: handlerName,
                       usesDataContext, source: siteOf(sf, node) })
    }

    if (fn === "registerComponentHandler") {
      const diType = registrationName(asString(a0), fn, sf, node)
      const gate = gatedBy(node)
      componentTypes.push({ diType, ...(gate && { gatedBy: gate }), source: siteOf(sf, node) })
    }

    if (fn === "registerAdornmentHandler") {
      const type = registrationName(asString(a0), fn, sf, node)
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
// Not every error goes through i18n. A handful are returned as raw string literals — the
// catalog would be quietly incomplete without them, and "every error string" would be false.
for (const [, sf] of sources) {
  if (!/\/data-interactive\//.test(rel(sf.fileName))) continue
  eachNode(sf, node => {
    if (!ts.isPropertyAssignment(node)) return
    const key = node.name && (ts.isIdentifier(node.name) || ts.isStringLiteralLike(node.name)) ? node.name.text : ""
    if (key !== "error" || !ts.isStringLiteralLike(node.initializer)) return
    addLiteralError(node.initializer.text, siteOf(sf, node))
  })
  // ...and errorResult("literal"), which is a call argument rather than a property.
  eachNode(sf, node => {
    if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) return
    if (node.expression.text !== "errorResult") return
    const arg = node.arguments[0]
    if (arg && ts.isStringLiteralLike(arg)) addLiteralError(arg.text, siteOf(sf, node))
  })
}
function addLiteralError(message, source) {
  if (message.length < 8 || errors.some(e => e.message === message)) return
  errors.push({ key: null, message, literal: true, source })
}
errors.sort((a, b) => cmp(a.key ?? a.message, b.key ?? b.message))

// --- pass 6: value/result type shapes -----------------------------------------------------
// The interfaces a plugin actually sends and receives. Members carry their declared type text
// and optionality; anything richer (defaults, semantics) is judgment and stays hand-written.
//
// Interfaces are resolved through their `extends` clauses. Every component type extends
// V2Component and DIAttribute extends Partial<ICodapV2Attribute>, so a declaration's own
// members are a small fraction of what a plugin actually sends — DIAttribute declares 2 and
// inherits 20. Inherited members are merged in and tagged with the interface they came from;
// a member redeclared locally wins. `Partial<X>` contributes X's members as optional, which
// is what Partial means. A base the walker cannot find is reported in `unresolvedBases`
// rather than silently dropped.
// Remove // and /* */ comments from a type's source text without touching quoted spans.
function stripComments(text) {
  let out = ""
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"' || c === "'" || c === "`") {
      const quote = c
      out += c
      for (i++; i < text.length; i++) {
        out += text[i]
        if (text[i] === "\\") { out += text[++i] ?? ""; continue }
        if (text[i] === quote) break
      }
      continue
    }
    if (c === "/" && text[i + 1] === "/") { while (i < text.length && text[i] !== "\n") i++; out += "\n"; continue }
    if (c === "/" && text[i + 1] === "*") { i += 2; while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++; i++; continue }
    out += c
  }
  return out
}

const memberOf = (sf, m) => ({
  name: m.name.text,
  // Collapse to one line, but keep member separators: a newline-separated inline object
  // type would otherwise print as `{ left: number top: number }`, which is not valid TS.
  // Strip comments before collapsing: an inline object type documented with `//` notes would
  // otherwise fold its prose into the type text and print as something that is not valid TS.
  // Quoted spans are skipped, so a string-literal type like `"https://example.org"` is not
  // truncated at its own slashes.
  type: m.type ? stripComments(m.type.getText(sf))
                      .replace(/,?\s*\n\s*/g, "; ").replace(/\s+/g, " ")
                      .replace(/;\s*}/g, " }").replace(/{\s*;\s*/g, "{ ")
                      .replace(/{\s*;+\s*/g, "{ ").replace(/;\s*;+/g, ";").trim() : "unknown",
  optional: !!m.questionToken
})

const isDITypeFile = f => /data-interactive\/data-interactive[\w-]*types\.ts$/.test(rel(f))

// Every interface in src/, so bases declared outside the DI type files still resolve.
// First declaration of a name wins; a DI-type-file declaration always wins over a non-DI one,
// so an unrelated same-named interface elsewhere in src/ cannot shadow the one we document.
const allInterfaces = new Map()
for (const [file, sf] of sources) {
  eachNode(sf, node => {
    if (!ts.isInterfaceDeclaration(node)) return
    const name = node.name.text
    const fromDIType = isDITypeFile(file)
    const existing = allInterfaces.get(name)
    if (existing && (existing.fromDIType || !fromDIType)) return
    const bases = []
    for (const h of node.heritageClauses ?? []) {
      if (h.token !== ts.SyntaxKind.ExtendsKeyword) continue
      for (const t of h.types) {
        const text = t.getText(sf).trim()
        const partial = /^Partial\s*<([\s\S]+)>$/.exec(text)
        const inner = (partial ? partial[1] : text).replace(/<[\s\S]*$/, "").trim()
        if (inner) bases.push({ name: inner, partial: !!partial })
      }
    }
    allInterfaces.set(name, {
      members: node.members
        .filter(m => ts.isPropertySignature(m) && m.name &&
                     (ts.isIdentifier(m.name) || ts.isStringLiteralLike(m.name)))
        .map(m => memberOf(sf, m)),
      bases,
      source: siteOf(sf, node),
      fromDIType
    })
  })
}

// A few shapes a plugin sends are declared as aliases rather than interfaces — notably
// `DIDataContext = Partial<ICodapV2DataContext>`, which `dataContext` pages need. Only the two
// forms that denote a single object shape are followed: `type X = Y` and `type X = Partial<Y>`,
// where Y is a plain named type. Unions (`DIAdornmentValues`), records and MST
// `Partial<SnapshotIn<typeof Model>>` do not denote one fixed member list, so they are skipped
// rather than approximated — their shapes stay hand-written, as the skill documents.
for (const [file, sf] of sources) {
  if (!isDITypeFile(file)) continue
  eachNode(sf, node => {
    if (!ts.isTypeAliasDeclaration(node)) return
    const name = node.name.text
    if (allInterfaces.has(name)) return
    const text = node.type.getText(sf).trim()
    const partial = /^Partial\s*<\s*([A-Za-z_$][\w$]*)\s*>$/.exec(text)
    const direct = /^([A-Za-z_$][\w$]*)$/.exec(text)
    const base = partial?.[1] ?? direct?.[1]
    if (!base) return
    allInterfaces.set(name, {
      members: [],
      bases: [{ name: base, partial: !!partial }],
      source: siteOf(sf, node),
      fromDIType: true
    })
  })
}

// Bases first, then own members, so a locally redeclared member overrides the inherited one.
// `seen` guards against a cycle in the heritage graph rather than trusting there isn't one.
function resolveMembers(name, seen = new Set()) {
  const iface = allInterfaces.get(name)
  if (!iface || seen.has(name)) return []
  seen.add(name)
  const out = []
  for (const b of iface.bases) {
    for (const m of resolveMembers(b.name, seen)) {
      out.push({ ...m, inherited: m.inherited ?? b.name, optional: b.partial || m.optional })
    }
  }
  for (const m of iface.members) out.push({ ...m })
  const byName = new Map()
  for (const m of out) byName.set(m.name, m)
  return [...byName.values()]
}

const valueTypes = {}
for (const [name, iface] of allInterfaces) {
  if (!iface.fromDIType) continue
  const members = resolveMembers(name)
  if (!members.length) continue
  valueTypes[name] = { members, source: iface.source }
  if (iface.bases.length) {
    valueTypes[name].extends = iface.bases.map(b => b.partial ? `Partial<${b.name}>` : b.name)
    const unresolved = iface.bases.filter(b => !allInterfaces.has(b.name)).map(b => b.name)
    if (unresolved.length) valueTypes[name].unresolvedBases = unresolved
  }
}

// --- provenance ---------------------------------------------------------------------------
let commit
try {
  commit = execFileSync("git", ["-C", repoRoot, "rev-parse", "--short=9", "HEAD"], { encoding: "utf8" }).trim()
} catch { commit = "unknown" }

const inventory = {
  $comment: "Generated by v3/scripts/plugin-api/extract-plugin-api.mjs. Do not edit by hand.",
  verifiedAgainst: commit,
  // The generator renders every action table and the schema enum from this, so an eighth action
  // added to DIBaseHandler reaches the docs instead of being silently dropped by a second list.
  actions: ACTIONS,
  counts: {
    resources: resources.length,
    componentTypes: componentTypes.length,
    adornmentTypes: adornmentTypes.length,
    errors: errors.length
  },
  resources: resources.sort((a, b) => cmp(a.name, b.name)),
  componentTypes: componentTypes.sort((a, b) => cmp(a.diType, b.diType)),
  adornmentTypes: adornmentTypes.sort((a, b) => cmp(a.type, b.type)),
  selectorKeys,
  defaultContextExemptions,
  errors,
  valueTypes
}

// Everything the generator renders from. An empty list here would rewrite real documentation
// into confident wrongness — an empty scope block, a selector grammar with no keys — so refuse.
required(resources, "the registered resources (registerDIHandler calls)")
required(componentTypes, "the component types (registerComponentHandler calls)")
required(adornmentTypes, "the adornment types (registerAdornmentHandler calls)")
required(selectorKeys, "the selector keys (interface DIResourceSelector)")
required(defaultContextExemptions, "the #default exemption list (resource-parser.ts)")
required(errors, "the error catalog (V3.DI.Error keys and literals)")
required(valueTypes, "the value interfaces (data-interactive-*types.ts)")

const pretty = process.argv.includes("--pretty")
process.stdout.write(JSON.stringify(inventory, null, pretty ? 2 : 0) + "\n")
