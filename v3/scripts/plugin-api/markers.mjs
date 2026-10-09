//
// markers.mjs
//
// The one definition of a well-formed generated-block marker, shared by the generator and the
// lint so they cannot disagree about whether a page is safe to rewrite. Deliberately free of
// side effects: the lint imports it, and importing the generator instead would run the whole
// pipeline — including its writes — as a side effect of linting.
//
// Walk the markers in order and reject anything the BLOCK regex would mis-span. This runs before
// any rewrite: with a typo'd END followed later by a same-named pair, BLOCK's lazy backreference
// spans from the first BEGIN to the *second* END, and write mode then replaces the headings and
// prose in between with a rendered table. Returns a list of problems; empty means safe to write.
export function markerProblems(raw) {
  const problems = []
  // Match on the word GENERATED inside an HTML comment, NOT on the exact syntax. A marker that
  // is malformed enough to not look like a marker — no colon, say — would otherwise be invisible
  // to this check and to the generator alike, which is the most dangerous shape of all: the block
  // is silently never written and nothing reports it. Recognize loosely, then require exactness.
  // Case-insensitive, and tolerant of a truncated keyword: `begin generated`, `BEGIN GENERATE:`
  // and `GENERATD` must all be recognised as attempted markers, or they are invisible to both
  // tools and the block is silently never written — the failure this walk exists to prevent.
  const markers = [...raw.matchAll(/<!--[^>]*\bGENERAT\w*\b[^>]*-->/gi)]
  const open = []
  const seen = new Set()
  for (const m of markers) {
    const text = m[0]
    const kind = /\bBEGIN\b/i.test(text) ? "BEGIN" : /\bEND\b/i.test(text) ? "END" : null
    if (!kind) { problems.push(`generated marker names neither BEGIN nor END: ${text}`); continue }
    const isBegin = kind === "BEGIN"
    const shape = isBegin
      ? /^<!-- BEGIN GENERATED: ([\w-]+)((?:\s+\w+=\S+)*) -->$/.exec(text)
      : /^<!-- END GENERATED: ([\w-]+) -->$/.exec(text)
    if (!shape) { problems.push(`malformed marker (the generator will not match it): ${text}`); continue }
    const name = shape[1]
    if (isBegin) {
      if (open.length) problems.push(`nested generated block: ${name} opened inside ${open[open.length - 1]}`)
      if (seen.has(name)) problems.push(`duplicate generated block name: ${name}`)
      seen.add(name)
      open.push(name)
    } else {
      if (!open.length) problems.push(`END GENERATED: ${name} with no matching BEGIN`)
      else if (open[open.length - 1] !== name) problems.push(`END GENERATED: ${name} closes ${open[open.length - 1]}`)
      else open.pop()
    }
  }
  for (const name of open) problems.push(`BEGIN GENERATED: ${name} is never closed`)
  return problems
}
