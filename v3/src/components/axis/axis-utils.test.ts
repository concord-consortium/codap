import { IDataConfigurationModel } from "../data-display/models/data-configuration-model"
import { kDefaultFontHeight } from "./axis-constants"
import { AxisPlace } from "./axis-types"
import { getNumberOfCategoriesLimit, setNumberOfCategoriesLimit } from "./axis-utils"
import { IAxisLayout } from "./models/axis-layout-context"
import { MultiScale } from "./models/multi-scale"

function makeLayout(length: number, repetitions = 1) {
  const multiScale = new MultiScale({ scaleType: "band", orientation: "vertical" })
  multiScale.setLength(length)
  multiScale.setRepetitions(repetitions)
  return {
    getAxisLength: () => length,
    getAxisMultiScale: () => multiScale
  } as unknown as IAxisLayout
}

describe("getNumberOfCategoriesLimit", () => {
  const place: AxisPlace = "left"

  it("bases the limit on the full axis length when the axis is not split", () => {
    expect(getNumberOfCategoriesLimit(makeLayout(10 * kDefaultFontHeight), place)).toBe(10)
    expect(getNumberOfCategoriesLimit(makeLayout(10.5 * kDefaultFontHeight), place)).toBe(10)
  })

  it("bases the limit on the length of one sub-axis when the axis is split", () => {
    const layout = makeLayout(12 * kDefaultFontHeight, 3)
    expect(getNumberOfCategoriesLimit(layout, place)).toBe(4)
  })

  it("never returns 0, which would be treated as no limit", () => {
    expect(getNumberOfCategoriesLimit(makeLayout(kDefaultFontHeight / 2), place)).toBe(1)
    expect(getNumberOfCategoriesLimit(makeLayout(2 * kDefaultFontHeight, 10), place)).toBe(1)
    expect(getNumberOfCategoriesLimit(makeLayout(0), place)).toBe(1)
  })

  it("falls back to the axis length when there is no multi-scale", () => {
    const layout = {
      getAxisLength: () => 5 * kDefaultFontHeight,
      getAxisMultiScale: () => undefined
    } as unknown as IAxisLayout
    expect(getNumberOfCategoriesLimit(layout, place)).toBe(5)
  })
})

describe("setNumberOfCategoriesLimit", () => {
  it("sets the per-sub-axis limit for the role associated with the axis place", () => {
    const setNumberOfCategoriesLimitForRole = jest.fn()
    const dataConfig = { setNumberOfCategoriesLimitForRole } as unknown as IDataConfigurationModel
    setNumberOfCategoriesLimit(dataConfig, "left", makeLayout(12 * kDefaultFontHeight, 2))
    expect(setNumberOfCategoriesLimitForRole).toHaveBeenCalledWith("y", 6)
    setNumberOfCategoriesLimit(dataConfig, "bottom", makeLayout(12 * kDefaultFontHeight, 4))
    expect(setNumberOfCategoriesLimitForRole).toHaveBeenCalledWith("x", 3)
  })
})
