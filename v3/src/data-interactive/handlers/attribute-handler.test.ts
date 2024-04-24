import { Attribute } from "../../models/data/attribute"
import { diAttributeHandler } from "./attribute-handler"
import { DIResultAttributes } from "../data-interactive-types"
import { DataSet } from "../../models/data/data-set"

describe("DataInteractive AttributeHandler", () => {
  const handler = diAttributeHandler
  it("get works as expected", () => {
    expect(handler.get?.({}).success).toBe(false)

    const attribute = Attribute.create({ name: "test" })
    const result = handler.get?.({ attribute })
    expect(result?.success).toBe(true)
    expect((result?.values as any)?.name).toBe("test")
  })
  it("create works as expected", () => {
    const dataContext = DataSet.create({})
    const resources = { dataContext }
    expect(handler.create?.(resources).success).toEqual(false)
    expect(dataContext.attributes.length).toBe(0)
    const name1 = "test"
    expect(handler.create?.(resources, { name: name1 }).success).toEqual(true)
    expect(dataContext.attributes.length).toBe(1)
    expect(dataContext.attributes[0].name).toBe(name1)
    const name2 = "test2"
    expect(handler.create?.(resources, [{ name: name2 }, {}]).success).toEqual(false)
    expect(dataContext.attributes.length).toBe(1)
    const name3 = "test3"
    const results = handler.create?.(resources, [{ name: name2 }, { name: name3 }])
    expect(results?.success).toEqual(true)
    expect((results?.values as DIResultAttributes)?.attrs?.length).toBe(2)
    expect(dataContext.attributes.length).toBe(3)
    expect(dataContext.attributes[1].name).toBe(name2)
    expect(dataContext.attributes[2].name).toBe(name3)
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
    const values = result?.values as DIResultAttributes
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
    const values2 = result2?.values as DIResultAttributes
    const resultAttr2 = values2.attrs?.[0]
    expect(resultAttr2?.type).toBe(type)
  })
  it("delete works as expected", () => {
    const attribute = Attribute.create({ name: "name" })
    const dataContext = DataSet.create({})
    dataContext.addAttribute(attribute)
    expect(dataContext.attributes.length).toBe(1)
    expect(handler.delete?.({ dataContext }).success).toEqual(false)
    expect(dataContext.attributes.length).toBe(1)
    expect(handler.delete?.({ dataContext, attribute }).success).toEqual(true)
    expect(dataContext.attributes.length).toBe(0)
  })
})
