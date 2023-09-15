import { getAdornmentComponentInfo } from "../../adornment-component-info"
import { getAdornmentContentInfo } from "../../adornment-content-info"
import { kMeanClass, kMeanPrefix, kMeanType } from "./mean-adornment-types"
import "./mean-adornment-registration"

describe("MeanRegistration", () => {
  it("registers content and component info", () => {
    const meanContentInfo = getAdornmentContentInfo(kMeanType)
    expect(meanContentInfo).toBeDefined()
    expect(meanContentInfo?.type).toBe(kMeanType)
    expect(meanContentInfo?.modelClass).toBeDefined()
    expect(meanContentInfo?.prefix).toBe(kMeanPrefix)
    const meanComponentInfo = getAdornmentComponentInfo(kMeanType)
    expect(meanComponentInfo).toBeDefined()
    expect(meanComponentInfo?.adornmentEltClass).toBe(kMeanClass)
    expect(meanComponentInfo?.Component).toBeDefined()
    expect(meanComponentInfo?.type).toBe(kMeanType)
  })
})
