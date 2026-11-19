import { getPaletteTopPosition } from "./view-utils"

describe("getPaletteTopPosition", () => {
  // Offsets are relative to the inspector panel's top; panelTop and minTop are screen coordinates.
  const kPaletteHeight = 200
  const kMinTop = 150         // e.g. the bottom of the app header
  const kDefaultMinTop = 120  // used when no minTop is given
  const kGap = 5              // space kept between minTop and the palette's top

  // the offset that centers the palette on its pointer
  const centeredTop = (pointerMid: number) => pointerMid - kPaletteHeight / 2
  // the offset that puts the palette's top just below minTop
  const minAllowedTop = (panelTop: number, minTop = kMinTop) => minTop + kGap - panelTop

  const position = (panelTop: number, pointerMid: number) =>
    getPaletteTopPosition({ panelTop, paletteHeight: kPaletteHeight, pointerMid, minTop: kMinTop })

  it("centers the palette on the pointer when there is room above", () => {
    const panelTop = 300
    for (const pointerMid of [150, 26]) {
      expect(centeredTop(pointerMid)).toBeGreaterThan(minAllowedTop(panelTop))
      expect(position(panelTop, pointerMid)).toBe(centeredTop(pointerMid))
    }
  })

  it("clamps the palette's top to just below minTop", () => {
    const pointerMid = 50
    const panelTop = 180
    // centering would put the palette's top above minTop
    expect(centeredTop(pointerMid)).toBeLessThan(minAllowedTop(panelTop))
    // the clamped top is above the panel's top
    expect(minAllowedTop(panelTop)).toBeLessThan(0)
    expect(position(panelTop, pointerMid)).toBe(minAllowedTop(panelTop))
  })

  it("pushes the palette down when the panel's top is above minTop", () => {
    const panelTop = 100
    expect(minAllowedTop(panelTop)).toBeGreaterThan(0)
    // centering already clears minTop
    expect(position(panelTop, 200)).toBe(centeredTop(200))
    // centering would not, so the palette moves below the panel's top
    expect(position(panelTop, 26)).toBe(minAllowedTop(panelTop))
  })

  it("uses the default app header height when no minTop is given", () => {
    const pointerMid = 50
    const panelTop = 150
    // distinguishes the default from kMinTop
    expect(minAllowedTop(panelTop, kDefaultMinTop)).not.toBe(minAllowedTop(panelTop))
    expect(getPaletteTopPosition({ panelTop, paletteHeight: kPaletteHeight, pointerMid }))
      .toBe(minAllowedTop(panelTop, kDefaultMinTop))
  })

  it("returns the same offset however many times it is computed", () => {
    // The result depends only on positions that don't move with the palette, so re-rendering is stable.
    const panelTop = 230
    const pointerMid = 26
    const first = position(panelTop, pointerMid)
    expect(first).toBe(centeredTop(pointerMid))
    expect(position(panelTop, pointerMid)).toBe(first)
  })
})
