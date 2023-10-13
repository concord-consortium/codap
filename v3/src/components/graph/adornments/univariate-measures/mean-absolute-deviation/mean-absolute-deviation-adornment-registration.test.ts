import { getAdornmentComponentInfo } from "../../adornment-component-info"
import { getAdornmentContentInfo } from "../../adornment-content-info"
import { kMeanAbsoluteDeviationClass, kMeanAbsoluteDeviationPrefix,
         kMeanAbsoluteDeviationType } from "./mean-absolute-deviation-adornment-types"
import "./mean-absolute-deviation-adornment-registration"

describe("MeanAbsoluteDeviationRegistration", () => {
  it("registers content and component info", () => {
    const standardDeviationInfo = getAdornmentContentInfo(kMeanAbsoluteDeviationType)
    expect(standardDeviationInfo).toBeDefined()
    expect(standardDeviationInfo?.type).toBe(kMeanAbsoluteDeviationType)
    expect(standardDeviationInfo?.modelClass).toBeDefined()
    expect(standardDeviationInfo?.prefix).toBe(kMeanAbsoluteDeviationPrefix)
    const standardDeviationComponentInfo = getAdornmentComponentInfo(kMeanAbsoluteDeviationType)
    expect(standardDeviationComponentInfo).toBeDefined()
    expect(standardDeviationComponentInfo?.adornmentEltClass).toBe(kMeanAbsoluteDeviationClass)
    expect(standardDeviationComponentInfo?.Component).toBeDefined()
    expect(standardDeviationComponentInfo?.type).toBe(kMeanAbsoluteDeviationType)
  })
})
