import { getAdornmentComponentInfo } from "./adornment-component-info"
import { getAdornmentContentInfo } from "./adornment-content-info"
import { kMovableLineClass, kMovableLinePrefix, kMovableLineType } from "./movable-line-types"
import "./movable-line-registration"

describe("Movable line registration", () => {
  it("Registers content and component info", () => {
    const movableLineContentInfo = getAdornmentContentInfo(kMovableLineType)
    expect(movableLineContentInfo).toBeDefined()
    expect(movableLineContentInfo?.type).toBe(kMovableLineType)
    expect(movableLineContentInfo?.modelClass).toBeDefined()
    expect(movableLineContentInfo?.prefix).toBe(kMovableLinePrefix)
    const movableLineComponentInfo = getAdornmentComponentInfo(kMovableLineType)
    expect(movableLineComponentInfo).toBeDefined()
    expect(movableLineComponentInfo?.adornmentEltClass).toBe(kMovableLineClass)
    expect(movableLineComponentInfo?.Component).toBeDefined()
    expect(movableLineComponentInfo?.type).toBe(kMovableLineType)
  })
})
