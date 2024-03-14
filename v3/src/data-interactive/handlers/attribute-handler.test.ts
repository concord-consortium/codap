import { Attribute } from "../../models/data/attribute"
import { diAttributeHandler } from "./attribute-handler"
import { diNotImplementedYetResult, DISingleValues } from "../data-interactive-types"

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
  it("update works as expected", () => {
    const attribute = Attribute.create({ name: "test" })
    const name = "new name"
    const title = "new title"
    const description = "new description"
    const unit = "new unit"
    const formula = "new formula"
    const editable = false
    const type = "qualitative"
    const precision = 10
    const result = handler.update?.({ attribute },
      { name, title, description, unit, formula, editable, type, precision })
    expect(result?.success).toBe(true)
    const values = result?.values as DISingleValues
    const resultAttr = values.attrs?.[0]
    expect(resultAttr?.name).toBe(name)
    expect(resultAttr?.title).toBe(title)
    expect(resultAttr?.description).toBe(description)
    expect(resultAttr?.unit).toBe(unit)
    expect(resultAttr?.formula).toBe(formula)
    expect(resultAttr?.editable).toBe(editable)
    expect(resultAttr?.type).toBe(type)
    expect(resultAttr?.precision).toBe(precision)

    const result2 = handler.update?.({ attribute }, { type: "fake type" })
    const values2 = result2?.values as DISingleValues
    const resultAttr2 = values2.attrs?.[0]
    expect(resultAttr2?.type).toBe(type)
  })
  it("delete is not implemented yet", () => {
    expect(handler.delete?.({})).toEqual(diNotImplementedYetResult)
  })
})
