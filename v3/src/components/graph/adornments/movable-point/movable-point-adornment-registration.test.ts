import { getAdornmentComponentInfo } from "../adornment-component-info"
import { getAdornmentContentInfo } from "../adornment-content-info"
import { kMovablePointClass, kMovablePointPrefix, kMovablePointType } from "./movable-point-adornment-types"
import "./movable-point-adornment-registration"

describe("Movable point registration", () => {
  it("Registers content and component info", () => {
    const movablePointContentInfo = getAdornmentContentInfo(kMovablePointType)
    expect(movablePointContentInfo).toBeDefined()
    expect(movablePointContentInfo?.type).toBe(kMovablePointType)
    expect(movablePointContentInfo?.modelClass).toBeDefined()
    expect(movablePointContentInfo?.prefix).toBe(kMovablePointPrefix)
    const movablePointComponentInfo = getAdornmentComponentInfo(kMovablePointType)
    expect(movablePointComponentInfo).toBeDefined()
    expect(movablePointComponentInfo?.adornmentEltClass).toBe(kMovablePointClass)
    expect(movablePointComponentInfo?.Component).toBeDefined()
    expect(movablePointComponentInfo?.type).toBe(kMovablePointType)
  })
})
