import { getAdornmentComponentInfo } from "../adornment-component-info"
import { getAdornmentContentInfo } from "../adornment-content-info"
import { kRegionOfInterestClass, kRegionOfInterestPrefix, kRegionOfInterestType }
  from "./region-of-interest-adornment-types"
import "./region-of-interest-adornment-registration"

describe("Region of Interest registration", () => {
  it("Registers content and component info", () => {
    const roiContentInfo = getAdornmentContentInfo(kRegionOfInterestType)
    expect(roiContentInfo).toBeDefined()
    expect(roiContentInfo?.type).toBe(kRegionOfInterestType)
    expect(roiContentInfo?.modelClass).toBeDefined()
    expect(roiContentInfo?.prefix).toBe(kRegionOfInterestPrefix)
    const roiComponentInfo = getAdornmentComponentInfo(kRegionOfInterestType)
    expect(roiComponentInfo).toBeDefined()
    expect(roiComponentInfo?.adornmentEltClass).toBe(kRegionOfInterestClass)
    expect(roiComponentInfo?.Component).toBeDefined()
    expect(roiComponentInfo?.type).toBe(kRegionOfInterestType)
  })
})
