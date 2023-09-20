import { getAdornmentComponentInfo } from "../adornment-component-info"
import { getAdornmentContentInfo } from "../adornment-content-info"
import { kPlottedValueClass, kPlottedValuePrefix, kPlottedValueType } from "./plotted-value-types"
import "./plotted-value-registration"

describe("PlottedValueRegistration", () => {
  it("registers content and component info", () => {
    const plottedValueContentInfo = getAdornmentContentInfo(kPlottedValueType)
    expect(plottedValueContentInfo).toBeDefined()
    expect(plottedValueContentInfo?.type).toBe(kPlottedValueType)
    expect(plottedValueContentInfo?.modelClass).toBeDefined()
    expect(plottedValueContentInfo?.prefix).toBe(kPlottedValuePrefix)
    const plottedValueComponentInfo = getAdornmentComponentInfo(kPlottedValueType)
    expect(plottedValueComponentInfo).toBeDefined()
    expect(plottedValueComponentInfo?.adornmentEltClass).toBe(kPlottedValueClass)
    expect(plottedValueComponentInfo?.Component).toBeDefined()
    expect(plottedValueComponentInfo?.BannerComponent).toBeDefined()
    expect(plottedValueComponentInfo?.type).toBe(kPlottedValueType)
  })
})
