import { getAdornmentComponentInfo } from "../adornment-component-info"
import { getAdornmentContentInfo } from "../adornment-content-info"
import { kPlottedFunctionClass, kPlottedFunctionPrefix, kPlottedFunctionType } from "./plotted-function-adornment-types"
import "./plotted-function-adornment-registration"

describe("PlottedFunctionRegistration", () => {
  it("registers content and component info", () => {
    const plottedFunctionContentInfo = getAdornmentContentInfo(kPlottedFunctionType)
    expect(plottedFunctionContentInfo).toBeDefined()
    expect(plottedFunctionContentInfo?.type).toBe(kPlottedFunctionType)
    expect(plottedFunctionContentInfo?.modelClass).toBeDefined()
    expect(plottedFunctionContentInfo?.prefix).toBe(kPlottedFunctionPrefix)
    const plottedFunctionComponentInfo = getAdornmentComponentInfo(kPlottedFunctionType)
    expect(plottedFunctionComponentInfo).toBeDefined()
    expect(plottedFunctionComponentInfo?.adornmentEltClass).toBe(kPlottedFunctionClass)
    expect(plottedFunctionComponentInfo?.Component).toBeDefined()
    expect(plottedFunctionComponentInfo?.BannerComponent).toBeDefined()
    expect(plottedFunctionComponentInfo?.type).toBe(kPlottedFunctionType)
  })
})
