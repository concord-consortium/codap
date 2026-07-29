import { getMenuPlacement, isSamePlacement } from "./formula-insert-menu-position"

const kMaxHeight = 470
// a button in the middle of a tall window, with room on both sides
const midButton = { top: 500, bottom: 530, height: 30 }

describe("getMenuPlacement", () => {
  it("places a menu below the button when it fits there", () => {
    const placement = getMenuPlacement(midButton, 200, kMaxHeight, 1000)
    expect(placement.top).toBe(30)
    expect(placement.bottom).toBeUndefined()
  })

  it("flips above when the menu does not fit below but does fit above", () => {
    // the reported case: a modal dragged near the bottom of a tall window
    const button = { top: 1239, bottom: 1269, height: 30 }
    const placement = getMenuPlacement(button, 98, kMaxHeight, 1353)
    expect(placement.bottom).toBe(30)
    expect(placement.top).toBeUndefined()
  })

  it("never returns a maxHeight larger than the space on the chosen side", () => {
    // 1353 - 1269 - 8 = 76 below, so a menu placed below may be no taller than that
    const button = { top: 1239, bottom: 1269, height: 30 }
    const tallWindowPlacement = getMenuPlacement(button, 98, kMaxHeight, 1353)
    expect(tallWindowPlacement.maxHeight).toBeLessThanOrEqual(1239 - 8)

    // a button with little room on either side still may not overflow
    const cramped = getMenuPlacement({ top: 60, bottom: 90, height: 30 }, 400, kMaxHeight, 150)
    expect(cramped.maxHeight).toBeLessThanOrEqual(Math.max(150 - 90 - 8, 60 - 8))
  })

  it("takes the roomier side when the menu fits neither", () => {
    // 300 below, 192 above: below wins even though the menu is cut off either way
    const placement = getMenuPlacement({ top: 200, bottom: 230, height: 30 }, 900, kMaxHeight, 538)
    expect(placement.top).toBe(30)
    expect(placement.maxHeight).toBe(538 - 230 - 8)

    // and the other way round
    const flipped = getMenuPlacement({ top: 400, bottom: 430, height: 30 }, 900, kMaxHeight, 530)
    expect(flipped.bottom).toBe(30)
    expect(flipped.maxHeight).toBe(400 - 8)
  })

  it("caps maxHeight at the menu's own maximum when there is ample room", () => {
    const placement = getMenuPlacement(midButton, 2000, kMaxHeight, 5000)
    expect(placement.maxHeight).toBe(kMaxHeight)
  })

  it("does not return a negative maxHeight when the button is off-screen", () => {
    const placement = getMenuPlacement({ top: -100, bottom: -70, height: 30 }, 200, kMaxHeight, 800)
    expect(placement.maxHeight).toBeGreaterThanOrEqual(0)
  })

  it("measures against the cap, so content taller than the cap still fits a large space", () => {
    // content is 2000 but the menu will only ever be 470, and 600 of room is enough for that
    const placement = getMenuPlacement({ top: 700, bottom: 730, height: 30 }, 2000, kMaxHeight, 1338)
    expect(placement.top).toBe(30)
  })
})

describe("isSamePlacement", () => {
  it("compares side and height", () => {
    expect(isSamePlacement({ top: 30, maxHeight: 100 }, { top: 30, maxHeight: 100 })).toBe(true)
    expect(isSamePlacement({ top: 30, maxHeight: 100 }, { top: 30, maxHeight: 200 })).toBe(false)
    expect(isSamePlacement({ top: 30, maxHeight: 100 }, { bottom: 30, maxHeight: 100 })).toBe(false)
    expect(isSamePlacement(undefined, { top: 30, maxHeight: 100 })).toBe(false)
  })
})
