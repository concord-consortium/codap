import { getAdornmentComponentInfo } from "../../adornment-component-info"
import { getAdornmentContentInfo } from "../../adornment-content-info"
import { kNormalCurveClass, kNormalCurvePrefix,
         kNormalCurveType } from "./normal-curve-adornment-types"
import "./normal-curve-adornment-registration"

describe("NormalCurveRegistration", () => {
  it("registers content and component info", () => {
    const standardErrorInfo = getAdornmentContentInfo(kNormalCurveType)
    expect(standardErrorInfo).toBeDefined()
    expect(standardErrorInfo?.type).toBe(kNormalCurveType)
    expect(standardErrorInfo?.modelClass).toBeDefined()
    expect(standardErrorInfo?.prefix).toBe(kNormalCurvePrefix)
    const standardErrorComponentInfo = getAdornmentComponentInfo(kNormalCurveType)
    expect(standardErrorComponentInfo).toBeDefined()
    expect(standardErrorComponentInfo?.adornmentEltClass).toBe(kNormalCurveClass)
    expect(standardErrorComponentInfo?.Component).toBeDefined()
    expect(standardErrorComponentInfo?.type).toBe(kNormalCurveType)
  })
})
