// jsdom does no text layout, so width is stubbed per character the way the sibling legend tests do.
jest.mock("../../../../hooks/use-measure-text", () => ({
  measureText: (text: string) => text.length * 10,
  // also stubbed because labelHeight, pulled in transitively, measures at module load
  measureTextExtent: (text: string) => ({ width: text.length * 10, height: 12 })
}))

import { wrapTextToWidth } from "./inoperable-legend-message"

describe("wrapTextToWidth", () => {
  it("leaves a string that fits on one line", () => {
    expect(wrapTextToWidth("one two", 1000)).toEqual(["one two"])
  })

  it("breaks between words at the available width", () => {
    // 10px per character, so 100px holds ten characters
    expect(wrapTextToWidth("aaaa bbbb cccc dddd", 100)).toEqual(["aaaa bbbb", "cccc dddd"])
  })

  it("rewraps as the width changes", () => {
    const text = "aaaa bbbb cccc dddd"
    expect(wrapTextToWidth(text, 50)).toEqual(["aaaa", "bbbb", "cccc", "dddd"])
    expect(wrapTextToWidth(text, 150)).toEqual(["aaaa bbbb cccc", "dddd"])
  })

  it("keeps a word too long to fit rather than dropping or splitting it", () => {
    // the legend can be narrower than a single word; overflowing one line beats losing the word
    expect(wrapTextToWidth("aaaaaaaaaa bb", 30)).toEqual(["aaaaaaaaaa", "bb"])
  })

  it("collapses runs of whitespace", () => {
    expect(wrapTextToWidth("  one   two  ", 1000)).toEqual(["one two"])
  })

  it("returns nothing for an empty string", () => {
    expect(wrapTextToWidth("", 1000)).toEqual([])
    expect(wrapTextToWidth("   ", 1000)).toEqual([])
  })
})
