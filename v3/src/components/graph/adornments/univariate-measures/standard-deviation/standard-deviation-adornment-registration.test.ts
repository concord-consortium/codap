import { getAdornmentComponentInfo } from "../../adornment-component-info"
import { getAdornmentContentInfo } from "../../adornment-content-info"
import { kStandardDeviationClass, kStandardDeviationPrefix,
         kStandardDeviationType } from "./standard-deviation-adornment-types"
import "./standard-deviation-adornment-registration"

describe("StandardDeviationRegistration", () => {
  it("registers content and component info", () => {
    const standardDeviationInfo = getAdornmentContentInfo(kStandardDeviationType)
    expect(standardDeviationInfo).toBeDefined()
    expect(standardDeviationInfo?.type).toBe(kStandardDeviationType)
    expect(standardDeviationInfo?.modelClass).toBeDefined()
    expect(standardDeviationInfo?.prefix).toBe(kStandardDeviationPrefix)
    const standardDeviationComponentInfo = getAdornmentComponentInfo(kStandardDeviationType)
    expect(standardDeviationComponentInfo).toBeDefined()
    expect(standardDeviationComponentInfo?.adornmentEltClass).toBe(kStandardDeviationClass)
    expect(standardDeviationComponentInfo?.Component).toBeDefined()
    expect(standardDeviationComponentInfo?.type).toBe(kStandardDeviationType)
  })
})
