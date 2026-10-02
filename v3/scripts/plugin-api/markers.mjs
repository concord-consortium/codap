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
  const markers = [...raw.matchAll(/<!--\s*(BEGIN|END)\s+GENERATED:[^>]*-->/g)]
  const open = []
  const seen = new Set()
  for (const m of markers) {
    const text = m[0]
    const isBegin = m[1] === "BEGIN"
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
