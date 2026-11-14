//
// markdown.mjs
//
// The markdown rules more than one script depends on, kept in one place so they cannot disagree:
// where fenced code is, and which anchor GitHub generates for each heading.
//

// The text with every newline inside a fenced code block replaced by a space. Offsets are
// unchanged, but each block becomes a single line, so a `#` line inside one is not a heading and
// a blank line inside one does not end a paragraph.
export function maskFences(text) {
  return text.replace(/```[\s\S]*?```/g, fence => fence.replace(/\n/g, " "))
}

// Each heading with its offset and the anchor GitHub generates for it: lowercased, punctuation
// other than hyphens dropped, spaces turned into hyphens, and repeats numbered -1, -2, ...
export function headingsOf(text) {
  const seen = new Map()
  return [...maskFences(text).matchAll(/^#{1,6} +(.+?) *#*$/gm)].map(m => {
    const base = m[1].toLowerCase().replace(/[^\p{L}\p{N}_\- ]/gu, "").replace(/ /g, "-")
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    return { offset: m.index, level: m[0].indexOf(" "), text: m[1], anchor: n ? `${base}-${n}` : base }
  })
}
