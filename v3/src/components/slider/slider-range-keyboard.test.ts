import { IRangeKeyContext, IRangeKeyModifiers, rangeForKey, rangesMatch } from "./slider-range-keyboard"

const context = (overrides: Partial<IRangeKeyContext> = {}): IRangeKeyContext => ({
  low: 4, high: 6, min: 0, max: 10, step: 0.5, pageSize: 1, getSnapValues: () => [1, 3, 4, 7, 9], ...overrides
})
const mods = (overrides: Partial<IRangeKeyModifiers> = {}): IRangeKeyModifiers =>
  ({ shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, ...overrides })
const noMods = mods()
const shift = mods({ shiftKey: true })
const alt = mods({ altKey: true })
const altShift = mods({ shiftKey: true, altKey: true })

describe("rangeForKey", () => {
  describe("a range with width", () => {
    it("moves the whole range by a step with the arrow keys", () => {
      expect(rangeForKey(context(), "ArrowRight", noMods)).toEqual({ kind: "move", low: 4.5 })
      expect(rangeForKey(context(), "ArrowUp", noMods)).toEqual({ kind: "move", low: 4.5 })
      expect(rangeForKey(context(), "ArrowLeft", noMods)).toEqual({ kind: "move", low: 3.5 })
      expect(rangeForKey(context(), "ArrowDown", noMods)).toEqual({ kind: "move", low: 3.5 })
    })

    it("moves the whole range by a page with Shift+Arrow and Page Up/Down", () => {
      expect(rangeForKey(context(), "ArrowRight", shift)).toEqual({ kind: "move", low: 5 })
      expect(rangeForKey(context(), "ArrowLeft", shift)).toEqual({ kind: "move", low: 3 })
      expect(rangeForKey(context(), "PageUp", noMods)).toEqual({ kind: "move", low: 5 })
      expect(rangeForKey(context(), "PageDown", noMods)).toEqual({ kind: "move", low: 3 })
    })

    it("moves the whole range to either end of the axis with Home and End", () => {
      expect(rangeForKey(context(), "Home", noMods)).toEqual({ kind: "move", low: 0 })
      expect(rangeForKey(context(), "End", noMods)).toEqual({ kind: "move", low: 8 })
    })

    it("widens and narrows from the upper edge with Alt+Right and Alt+Left", () => {
      expect(rangeForKey(context(), "ArrowRight", alt)).toEqual({ kind: "resize", low: 4, high: 6.5 })
      expect(rangeForKey(context(), "ArrowLeft", alt)).toEqual({ kind: "resize", low: 4, high: 5.5 })
      expect(rangeForKey(context(), "ArrowRight", altShift)).toEqual({ kind: "resize", low: 4, high: 7 })
      expect(rangeForKey(context(), "ArrowLeft", altShift)).toEqual({ kind: "resize", low: 4, high: 5 })
    })

    it("collapses rather than inverting when narrowed past the lower edge", () => {
      expect(rangeForKey(context({ high: 4.25 }), "ArrowLeft", alt)).toEqual({ kind: "resize", low: 4, high: 4 })
    })

    it("doesn't widen past the end of the axis", () => {
      expect(rangeForKey(context({ high: 9.75 }), "ArrowRight", alt)).toEqual({ kind: "resize", low: 4, high: 10 })
    })

    it("leaves Alt+Up and Alt+Down alone (Chromebooks send them as Page Up and Page Down)", () => {
      expect(rangeForKey(context(), "ArrowUp", alt)).toBeUndefined()
      expect(rangeForKey(context(), "ArrowDown", alt)).toBeUndefined()
    })

    it("leaves Ctrl and Meta chords to the system, browser and screen reader", () => {
      expect(rangeForKey(context(), "ArrowRight", mods({ ctrlKey: true }))).toBeUndefined()
      expect(rangeForKey(context(), "ArrowLeft", mods({ metaKey: true }))).toBeUndefined()
      expect(rangeForKey(context(), "Home", mods({ ctrlKey: true, altKey: true }))).toBeUndefined()
    })

    it("doesn't compute the data's values, which only a collapsed range needs", () => {
      const getSnapValues = jest.fn(() => [1, 3, 4, 7, 9])
      rangeForKey(context({ getSnapValues }), "ArrowRight", noMods)
      rangeForKey(context({ getSnapValues }), "End", noMods)
      expect(getSnapValues).not.toHaveBeenCalled()
    })

    it("leaves other keys alone", () => {
      expect(rangeForKey(context(), "Tab", noMods)).toBeUndefined()
      expect(rangeForKey(context(), "a", noMods)).toBeUndefined()
      expect(rangeForKey(context(), "Home", alt)).toBeUndefined()
    })
  })

  describe("a collapsed range", () => {
    const collapsed = (low: number) => context({ low, high: low })

    it("steps through the data's values with the arrow keys", () => {
      expect(rangeForKey(collapsed(4), "ArrowRight", noMods)).toEqual({ kind: "move", low: 7 })
      expect(rangeForKey(collapsed(4), "ArrowLeft", noMods)).toEqual({ kind: "move", low: 3 })
    })

    it("stays put at the first or last value", () => {
      expect(rangeForKey(collapsed(9), "ArrowRight", noMods)).toEqual({ kind: "move", low: 9 })
      expect(rangeForKey(collapsed(1), "ArrowLeft", noMods)).toEqual({ kind: "move", low: 1 })
    })

    it("pages to the first value at or beyond a page away", () => {
      const ctx = context({ low: 1, high: 1, pageSize: 2.5 })
      expect(rangeForKey(ctx, "PageUp", noMods)).toEqual({ kind: "move", low: 4 })
      expect(rangeForKey({ ...ctx, low: 9, high: 9 }, "PageDown", noMods)).toEqual({ kind: "move", low: 4 })
      // nothing that far away: the last value in that direction
      expect(rangeForKey({ ...ctx, low: 7, high: 7 }, "PageUp", noMods)).toEqual({ kind: "move", low: 9 })
    })

    it("goes to the first or last value on the axis with Home and End", () => {
      expect(rangeForKey(collapsed(4), "Home", noMods)).toEqual({ kind: "move", low: 1 })
      expect(rangeForKey(collapsed(4), "End", noMods)).toEqual({ kind: "move", low: 9 })
      const zoomed = context({ low: 4, high: 4, min: 2, max: 8 })
      expect(rangeForKey(zoomed, "Home", noMods)).toEqual({ kind: "move", low: 3 })
      expect(rangeForKey(zoomed, "End", noMods)).toEqual({ kind: "move", low: 7 })
    })

    it("pages by Shift+Arrow as by Page Up/Down", () => {
      const ctx = context({ low: 1, high: 1, pageSize: 2.5 })
      expect(rangeForKey(ctx, "ArrowRight", shift)).toEqual({ kind: "move", low: 4 })
      expect(rangeForKey({ ...ctx, low: 9, high: 9 }, "ArrowLeft", shift)).toEqual({ kind: "move", low: 4 })
    })

    it("pages to a value exactly a page away", () => {
      const ctx = context({ low: 1, high: 1, pageSize: 2 })
      expect(rangeForKey(ctx, "PageUp", noMods)).toEqual({ kind: "move", low: 3 })
    })

    it("moves by steps, as a range with width does, where the axis shows none of the data's values", () => {
      const gap = context({ low: 5, high: 5, min: 5, max: 6.5 })
      expect(rangeForKey(gap, "ArrowRight", noMods)).toEqual({ kind: "move", low: 5.5 })
      expect(rangeForKey(gap, "ArrowLeft", noMods)).toEqual({ kind: "move", low: 4.5 })
      expect(rangeForKey(gap, "PageUp", noMods)).toEqual({ kind: "move", low: 6 })
      expect(rangeForKey(gap, "Home", noMods)).toEqual({ kind: "move", low: 5 })
      expect(rangeForKey(gap, "End", noMods)).toEqual({ kind: "move", low: 6.5 })
    })

    it("widens from the point with Alt+Right, and ignores Alt+Left", () => {
      expect(rangeForKey(collapsed(4), "ArrowRight", alt)).toEqual({ kind: "resize", low: 4, high: 4.5 })
      expect(rangeForKey(collapsed(4), "ArrowLeft", alt)).toBeUndefined()
    })
  })
})

describe("rangesMatch", () => {
  it("treats ranges that differ only by floating-point error as the same", () => {
    // 0.3 + 0.1 - 0.1 is 0.30000000000000004
    expect(rangesMatch([0.3 + 0.1 - 0.1, 1], [0.3, 1], 0.1)).toBe(true)
  })

  it("tells apart ranges that differ by a fraction of a step", () => {
    expect(rangesMatch([0.31, 1], [0.3, 1], 0.1)).toBe(false)
    expect(rangesMatch([0.3, 1.01], [0.3, 1], 0.1)).toBe(false)
  })
})
