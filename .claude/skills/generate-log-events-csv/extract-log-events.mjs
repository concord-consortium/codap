#!/usr/bin/env node
//
// extract-log-events.mjs
//
// Deterministic extractor for CODAP v3 log events. Parses every non-test
// source file under v3/src with the TypeScript compiler API and emits one
// record per distinct log Event that the code can emit.
//
// It captures every log-emitting form used in the codebase:
//   - logMessageWithReplacement(message, args)   -> %@ slots filled by Object.values(args) in order
//   - logStringifiedObjectMessage(message, args) -> single %@ filled by the whole stringified args object
//   - logModelChangeFn(message, modelStateFn)    -> %@ slots filled by initial-then-final model state
//   - Logger.log(event, args?)                   -> event string (may be a template literal)
//   - log: / log = payloads passed to applyModelChange, as a bare string, template
//     literal, inline { message, args } object, or a ternary choosing between strings
//   - the data-interactive logMessage handler, whose event is plugin-defined at runtime
//
// It does NOT author human descriptions and cannot always infer parameter TYPES or
// the placeholders of logModelChangeFn (those come from a model-state function). Those
// judgement fields are marked "?" for new events and are meant to be filled/curated
// downstream (see build-csv.mjs, which preserves curated values across regenerations).
//
// Output: a JSON array on stdout, one object per distinct Event:
//   { event, placeholders, parameters, sources: ["path:line", ...], kinds: [...] }
//
// Usage (from anywhere): node extract-log-events.mjs
//
import { readFileSync, readdirSync, statSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join, relative } from "node:path"
import { createRequire } from "node:module"

const here = dirname(fileURLToPath(import.meta.url))
// This script lives at <repo>/.claude/skills/generate-log-events-csv/
const repoRoot = join(here, "..", "..", "..")
const v3Dir = join(repoRoot, "v3")
const srcDir = join(v3Dir, "src")

// Resolve the repo's own TypeScript (anchored at v3/package.json) regardless of cwd.
const require = createRequire(join(v3Dir, "package.json"))
const ts = require("typescript")

const REPLACEMENT_HELPER = "logMessageWithReplacement"
const STRINGIFIED_HELPER = "logStringifiedObjectMessage"
const MODEL_CHANGE_HELPER = "logModelChangeFn"
const HELPERS = new Set([REPLACEMENT_HELPER, STRINGIFIED_HELPER, MODEL_CHANGE_HELPER])

// The data-interactive handler that forwards plugin-supplied events. Its message is a
// runtime value, so we emit a single synthetic row representing the open category.
const PLUGIN_HANDLER_SUFFIX = "data-interactive/handlers/log-message-handler.ts"
const PLUGIN_EVENT = "<plugin-defined>"

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) {
      walk(p, out)
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) {
      out.push(p)
    }
  }
  return out
}

// Convert a string-literal or template-literal expression to an Event template,
// replacing each ${expr} with %@ and collecting the interpolated expression texts.
function eventFromExpr(node, sf) {
  if (ts.isStringLiteralLike(node)) {
    return { event: node.text, slots: [] }
  }
  if (ts.isNoSubstitutionTemplateLiteral(node)) {
    return { event: node.text, slots: [] }
  }
  if (ts.isTemplateExpression(node)) {
    let event = node.head.text
    const slots = []
    for (const span of node.templateSpans) {
      event += "%@" + span.literal.text
      slots.push(span.expression.getText(sf))
    }
    return { event, slots }
  }
  return null
}

// Per-file map of simple `const NAME = <string|template|ternary>` declarations, so a log
// message passed as a variable (e.g. `const logString = cond ? "A" : "B"`) can be resolved.
let CONST_MAP = new Map()

function collectConsts(sf) {
  const map = new Map()
  const visit = n => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
      const init = n.initializer
      if ((ts.isStringLiteralLike(init) || ts.isNoSubstitutionTemplateLiteral(init) ||
           ts.isTemplateExpression(init) || ts.isConditionalExpression(init)) &&
          !map.has(n.name.text)) {
        map.set(n.name.text, init)
      }
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
  return map
}

// A message expression may be a plain string/template, a ternary choosing between several
// string/template messages, or a variable that resolves (in-file) to either. Each ternary
// branch is a distinct Event in the real logs (you never see "A / B" logged), so ternaries
// are always split. `seen` guards against a variable resolving cyclically to itself.
function eventsFromMessage(node, sf, seen = new Set()) {
  if (ts.isConditionalExpression(node)) {
    return [...eventsFromMessage(node.whenTrue, sf, seen),
            ...eventsFromMessage(node.whenFalse, sf, seen)]
  }
  if (ts.isIdentifier(node) && CONST_MAP.has(node.text) && !seen.has(node.text)) {
    seen.add(node.text)
    return eventsFromMessage(CONST_MAP.get(node.text), sf, seen)
  }
  const ev = eventFromExpr(node, sf)
  return ev ? [ev] : []
}

// Extract the property key names, in source order, from an object-literal expression.
function objectKeys(node, sf) {
  if (!node || !ts.isObjectLiteralExpression(node)) return null
  const keys = []
  for (const prop of node.properties) {
    if (ts.isShorthandPropertyAssignment(prop)) keys.push(prop.name.getText(sf))
    else if (ts.isPropertyAssignment(prop)) keys.push(prop.name.getText(sf))
    else if (ts.isSpreadAssignment(prop)) keys.push("..." + prop.expression.getText(sf))
    else keys.push("?")
  }
  return keys
}

function paramsFromKeys(keys) {
  if (keys == null) return "?"
  if (keys.length === 0) return ""
  return "{ " + keys.join(", ") + " }"
}

const rows = [] // { event, placeholders, parameters, source, kind }

function push(event, placeholders, parameters, source, kind) {
  if (event == null) return
  rows.push({ event, placeholders, parameters, source, kind })
}

// Find the `message` and `args` inside an inline { message, args, category } object.
// The message may itself be a ternary, so this returns one entry per resulting event.
function fromInlineLogObject(obj, sf) {
  let messageNode, argsNode
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue
    const key = prop.name.getText(sf)
    if (key === "message") messageNode = prop.initializer
    else if (key === "args") argsNode = prop.initializer
  }
  if (!messageNode) return []
  const keys = argsNode ? objectKeys(argsNode, sf) : []
  return eventsFromMessage(messageNode, sf).map(ev => ({ ev, keys }))
}

// Handle a value assigned to a `log` property, `log` variable, or `log = ...` (not a
// helper call). Bare strings/templates/ternaries carry no args; inline objects may.
function handleLogValue(value, sf, source) {
  if (ts.isObjectLiteralExpression(value)) {
    for (const { ev, keys } of fromInlineLogObject(value, sf)) {
      push(ev.event, ev.slots.join(", "), paramsFromKeys(keys), source, "log:object")
    }
    return
  }
  for (const ev of eventsFromMessage(value, sf)) {
    push(ev.event, ev.slots.join(", "), "", source, "log:string")
  }
  // CallExpression (helper) values are captured by the call-expression visitor; other
  // dynamic values are not statically resolvable and are skipped.
}

for (const file of walk(srcDir)) {
  const content = readFileSync(file, "utf8")
  const scriptKind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sf = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, scriptKind)
  const rel = relative(v3Dir, file)
  const isPluginHandler = file.endsWith(PLUGIN_HANDLER_SUFFIX)
  CONST_MAP = collectConsts(sf)

  const lineOf = node => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
  const srcOf = node => `${rel}:${lineOf(node)}`

  const visit = node => {
    // 1) Direct log-emitting call expressions.
    if (ts.isCallExpression(node)) {
      const callee = node.expression
      const calleeName = ts.isIdentifier(callee) ? callee.text : undefined
      const isLoggerLog = ts.isPropertyAccessExpression(callee) &&
        ts.isIdentifier(callee.expression) && callee.expression.text === "Logger" &&
        callee.name.text === "log"

      if (calleeName && HELPERS.has(calleeName)) {
        const [arg0, arg1] = node.arguments
        const evs = arg0 ? eventsFromMessage(arg0, sf) : []
        if (!evs.length) {
          // Non-static message. The plugin handler forwards a runtime event name.
          if (isPluginHandler) {
            push(PLUGIN_EVENT, "positional replaceArgs (0, 1, ...)",
              "{ [index: string]: string|number|boolean }", srcOf(node), "plugin")
          }
        } else if (calleeName === REPLACEMENT_HELPER) {
          const keys = objectKeys(arg1, sf)
          for (const ev of evs) {
            const ph = keys != null && keys.length ? keys.join(", ") : ev.slots.join(", ")
            push(ev.event, ph, paramsFromKeys(keys), srcOf(node), REPLACEMENT_HELPER)
          }
        } else if (calleeName === STRINGIFIED_HELPER) {
          const keys = objectKeys(arg1, sf)
          const ph = keys != null ? paramsFromKeys(keys) : "?"
          for (const ev of evs) push(ev.event, ph, paramsFromKeys(keys), srcOf(node), STRINGIFIED_HELPER)
        } else if (calleeName === MODEL_CHANGE_HELPER) {
          // Placeholders/params come from a model-state function; not statically known.
          for (const ev of evs) push(ev.event, "?", "?", srcOf(node), MODEL_CHANGE_HELPER)
        }
      } else if (isLoggerLog) {
        const [arg0, arg1] = node.arguments
        const keys = objectKeys(arg1, sf)
        for (const ev of (arg0 ? eventsFromMessage(arg0, sf) : [])) {
          push(ev.event, ev.slots.join(", "), paramsFromKeys(keys), srcOf(node), "Logger.log")
        }
      }
    }

    // 2) `log:` object-property payloads that are not helper calls.
    if (ts.isPropertyAssignment(node) && node.name.getText(sf) === "log" &&
        !ts.isCallExpression(node.initializer)) {
      handleLogValue(node.initializer, sf, srcOf(node))
    }

    // 3) `log = ...` assignments that are not helper calls.
    if (ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isIdentifier(node.left) && node.left.text === "log" &&
        !ts.isCallExpression(node.right)) {
      handleLogValue(node.right, sf, srcOf(node))
    }

    // 4) `const log = ...` / `let log = ...` declarations that are not helper calls.
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) &&
        node.name.text === "log" && node.initializer &&
        !ts.isCallExpression(node.initializer)) {
      handleLogValue(node.initializer, sf, srcOf(node))
    }

    ts.forEachChild(node, visit)
  }
  visit(sf)
}

// Collapse to one record per distinct Event, merging sources and best-effort fields.
const byEvent = new Map()
for (const r of rows) {
  let rec = byEvent.get(r.event)
  if (!rec) {
    rec = { event: r.event, placeholders: r.placeholders, parameters: r.parameters,
            sources: [], kinds: [] }
    byEvent.set(r.event, rec)
  }
  // Prefer a concrete (non "?", non-empty) placeholders/parameters value if one appears.
  if ((rec.placeholders === "?" || rec.placeholders === "") && r.placeholders &&
      r.placeholders !== "?") {
    rec.placeholders = r.placeholders
  }
  if ((rec.parameters === "?" || rec.parameters === "") && r.parameters &&
      r.parameters !== "?") {
    rec.parameters = r.parameters
  }
  if (!rec.sources.includes(r.source)) rec.sources.push(r.source)
  if (!rec.kinds.includes(r.kind)) rec.kinds.push(r.kind)
}

const result = [...byEvent.values()].sort((a, b) =>
  a.event.toLowerCase() < b.event.toLowerCase() ? -1
    : a.event.toLowerCase() > b.event.toLowerCase() ? 1 : 0)

process.stdout.write(JSON.stringify(result, null, 2) + "\n")
