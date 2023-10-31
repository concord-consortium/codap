import { getAdornmentComponentInfo } from "../adornment-component-info"
import { getAdornmentContentInfo } from "../adornment-content-info"
import { kLSRLClass, kLSRLPrefix, kLSRLType } from "./lsrl-adornment-types"
import "./lsrl-adornment-registration"

describe("Least Squares Line registration", () => {
  it("Registers content and component info", () => {
    const lSRLContentInfo = getAdornmentContentInfo(kLSRLType)
    expect(lSRLContentInfo).toBeDefined()
    expect(lSRLContentInfo?.type).toBe(kLSRLType)
    expect(lSRLContentInfo?.modelClass).toBeDefined()
    expect(lSRLContentInfo?.prefix).toBe(kLSRLPrefix)
    const lSRLComponentInfo = getAdornmentComponentInfo(kLSRLType)
    expect(lSRLComponentInfo).toBeDefined()
    expect(lSRLComponentInfo?.adornmentEltClass).toBe(kLSRLClass)
    expect(lSRLComponentInfo?.Component).toBeDefined()
    expect(lSRLComponentInfo?.type).toBe(kLSRLType)
  })
})
