//
// markdown.mjs
//
// The markdown rules more than one script depends on, kept in one place so they cannot disagree:
// where fenced code is, which ```json blocks a page has, and which anchor GitHub generates for each
// heading.
//

// A fenced code block: three backticks, anything, three backticks. The one definition of a fence;
// a `json` block is a fence whose info string is `json`.
const kFence = "```([\\s\\S]*?)```"
const fenceRegExp = () => new RegExp(kFence, "g")

// The text with every fenced code block removed.
export function stripFences(text) {
  return text.replace(fenceRegExp(), "")
}

// Each ```json block: its body, and the offset of its opening fence.
export function jsonBlocksOf(text) {
  return [...text.matchAll(fenceRegExp())]
    .filter(m => m[1].startsWith("json\n"))
    .map(m => ({ body: m[1].slice("json\n".length), index: m.index }))
}

// The text with every newline inside a fenced code block replaced by a space. Offsets are
// unchanged, but each block becomes a single line, so a `#` line inside one is not a heading and
// a blank line inside one does not end a paragraph.
export function maskFences(text) {
  return text.replace(fenceRegExp(), fence => fence.replace(/\n/g, " "))
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
