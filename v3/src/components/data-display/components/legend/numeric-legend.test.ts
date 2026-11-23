import { axisGap, labelPaddingY } from "../../../axis/axis-types"
import { kChoroplethHeight } from "../../data-display-types"
import { numericLegendExtent } from "./numeric-legend"

describe("numericLegendExtent", () => {
  const labelHeight = 14
  const numberHeight = 12
  const baseExtent = labelHeight + 2 * labelPaddingY + kChoroplethHeight + numberHeight + 2 * axisGap

  it("adds no clearance by default", () => {
    expect(numericLegendExtent({ labelHeight, numberHeight })).toBe(baseExtent)
  })

  it("adds the bottom clearance when it is given", () => {
    expect(numericLegendExtent({ labelHeight, numberHeight, bottomClearance: 10 })).toBe(baseExtent + 10)
  })
})
