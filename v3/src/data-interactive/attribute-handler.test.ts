import { Attribute } from "../models/data/attribute"
import { diAttributeHandler } from "./attribute-handler"
import { diNotImplementedYetResult } from "./data-interactive-types"

describe("DataInteractive AttributeHandler", () => {
  const handler = diAttributeHandler
  it("get works as expected", () => {
    expect(handler.get?.({}).success).toBe(false)

    const attribute = Attribute.create({ name: "test" })
    const result = handler.get?.({ attribute })
    expect(result?.success).toBe(true)
    expect((result?.values as any)?.name).toBe("test")
  })
  it("create is not implemented yet", () => {
    expect(handler.create?.({})).toEqual(diNotImplementedYetResult)
  })
  it("update is not implemented yet", () => {
    expect(handler.update?.({})).toEqual(diNotImplementedYetResult)
  })
  it("delete is not implemented yet", () => {
    expect(handler.delete?.({})).toEqual(diNotImplementedYetResult)
  })
})
