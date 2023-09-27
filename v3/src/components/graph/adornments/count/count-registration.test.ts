import { getAdornmentComponentInfo } from "../adornment-component-info"
import { getAdornmentContentInfo } from "../adornment-content-info"
import { kCountClass, kCountPrefix, kCountType } from "./count-types"
import "./count-registration"

describe("CountRegistration", () => {
  it("registers content and component info", () => {
    const countContentInfo = getAdornmentContentInfo(kCountType)
    expect(countContentInfo).toBeDefined()
    expect(countContentInfo?.type).toBe(kCountType)
    expect(countContentInfo?.modelClass).toBeDefined()
    expect(countContentInfo?.prefix).toBe(kCountPrefix)
    const countComponentInfo = getAdornmentComponentInfo(kCountType)
    expect(countComponentInfo).toBeDefined()
    expect(countComponentInfo?.adornmentEltClass).toBe(kCountClass)
    expect(countComponentInfo?.Component).toBeDefined()
    expect(countComponentInfo?.type).toBe(kCountType)
  })
})
