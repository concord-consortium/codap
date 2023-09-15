import { getAdornmentComponentInfo } from "../../adornment-component-info"
import { getAdornmentContentInfo } from "../../adornment-content-info"
import { kMedianClass, kMedianPrefix, kMedianType } from "./median-adornment-types"
import "./median-adornment-registration"

describe("MedianAdornmentRegistration", () => {
  it("registers content and component info", () => {
    const meanMedianContentInfo = getAdornmentContentInfo(kMedianType)
    expect(meanMedianContentInfo).toBeDefined()
    expect(meanMedianContentInfo?.type).toBe(kMedianType)
    expect(meanMedianContentInfo?.modelClass).toBeDefined()
    expect(meanMedianContentInfo?.prefix).toBe(kMedianPrefix)
    const meanMedianComponentInfo = getAdornmentComponentInfo(kMedianType)
    expect(meanMedianComponentInfo).toBeDefined()
    expect(meanMedianComponentInfo?.adornmentEltClass).toBe(kMedianClass)
    expect(meanMedianComponentInfo?.Component).toBeDefined()
    expect(meanMedianComponentInfo?.type).toBe(kMedianType)
  })
})
