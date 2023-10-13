import { getAdornmentComponentInfo } from "../../adornment-component-info"
import { getAdornmentContentInfo } from "../../adornment-content-info"
import { kBoxPlotClass, kBoxPlotPrefix, kBoxPlotType } from "./box-plot-adornment-types"
import "./box-plot-adornment-registration"

describe("BoxPlotRegistration", () => {
  it("registers content and component info", () => {
    const boxPlotContentInfo = getAdornmentContentInfo(kBoxPlotType)
    expect(boxPlotContentInfo).toBeDefined()
    expect(boxPlotContentInfo?.type).toBe(kBoxPlotType)
    expect(boxPlotContentInfo?.modelClass).toBeDefined()
    expect(boxPlotContentInfo?.prefix).toBe(kBoxPlotPrefix)
    const boxPlotComponentInfo = getAdornmentComponentInfo(kBoxPlotType)
    expect(boxPlotComponentInfo).toBeDefined()
    expect(boxPlotComponentInfo?.adornmentEltClass).toBe(kBoxPlotClass)
    expect(boxPlotComponentInfo?.Component).toBeDefined()
    expect(boxPlotComponentInfo?.type).toBe(kBoxPlotType)
  })
})
