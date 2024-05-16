import { getAdornmentComponentInfo } from "../../adornment-component-info"
import { getAdornmentContentInfo } from "../../adornment-content-info"
import { kStandardErrorClass, kStandardErrorPrefix,
         kStandardErrorType } from "./standard-error-adornment-types"
import "./standard-error-adornment-registration"

describe("StandardErrorRegistration", () => {
  it("registers content and component info", () => {
    const standardErrorInfo = getAdornmentContentInfo(kStandardErrorType)
    expect(standardErrorInfo).toBeDefined()
    expect(standardErrorInfo?.type).toBe(kStandardErrorType)
    expect(standardErrorInfo?.modelClass).toBeDefined()
    expect(standardErrorInfo?.prefix).toBe(kStandardErrorPrefix)
    const standardErrorComponentInfo = getAdornmentComponentInfo(kStandardErrorType)
    expect(standardErrorComponentInfo).toBeDefined()
    expect(standardErrorComponentInfo?.adornmentEltClass).toBe(kStandardErrorClass)
    expect(standardErrorComponentInfo?.Component).toBeDefined()
    expect(standardErrorComponentInfo?.type).toBe(kStandardErrorType)
  })
})
