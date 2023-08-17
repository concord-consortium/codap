import { getAdornmentComponentInfo } from "../adornment-component-info"
import { getAdornmentContentInfo } from "../adornment-content-info"
import { kMovableValueClass, kMovableValuePrefix, kMovableValueType } from "./movable-value-types"
import "./movable-value-registration"

describe("Movable value registration", () => {
  it("Registers content and component info", () => {
    const movableValueContentInfo = getAdornmentContentInfo(kMovableValueType)
    expect(movableValueContentInfo).toBeDefined()
    expect(movableValueContentInfo?.type).toBe(kMovableValueType)
    expect(movableValueContentInfo?.modelClass).toBeDefined()
    expect(movableValueContentInfo?.prefix).toBe(kMovableValuePrefix)
    const movableValueComponentInfo = getAdornmentComponentInfo(kMovableValueType)
    expect(movableValueComponentInfo).toBeDefined()
    expect(movableValueComponentInfo?.adornmentEltClass).toBe(kMovableValueClass)
    expect(movableValueComponentInfo?.Component).toBeDefined()
    expect(movableValueComponentInfo?.type).toBe(kMovableValueType)
  })
})
