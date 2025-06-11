import { Attribute } from "../../models/data/attribute"
import { diAttributeHandler } from "./attribute-handler"
import { DIResultAttributes } from "../data-interactive-data-set-types"
import { DataSet } from "../../models/data/data-set"
import { setupTestDataset } from "../../test/dataset-test-utils"
import { AppHistoryService } from "../../models/history/app-history-service"

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
    const { dataset: dataContext, c1 } = setupTestDataset()
    const resources = { dataContext, collection: c1 }
    const create = handler.create!

    expect(create(resources).success).toEqual(false)
    expect(create({ dataContext }, { name: "noCollection" }).success).toEqual(false)

    expect(dataContext.attributes.length).toBe(4)
    expect(c1.attributes.length).toBe(1)
    const name1 = "test"
    expect(create(resources, { name: name1 }).success).toEqual(true)
    expect(dataContext.attributes.length).toBe(5)
    expect(c1.attributes.length).toBe(2)
    const testAttr = c1.attributes[1]!
    expect(testAttr.name).toBe(name1)

    expect(testAttr.description).toBeUndefined()
    const description = "Test Description"
    expect(create(resources, { name: name1, description }).success).toBe(true)
    expect(c1.attributes.length).toBe(2)
    expect(testAttr.description).toBe(description)

    const name2 = "test2"
    expect(create(resources, [{ name: name2 }, {}]).success).toEqual(false)
    expect(dataContext.attributes.length).toBe(5)

    const name3 = "test3"
    const results = create(resources, [{ name: name2 }, { name: name3 }])
    expect(results.success).toEqual(true)
    expect((results.values as DIResultAttributes).attrs.length).toBe(2)
    expect(dataContext.attributes.length).toBe(7)
    expect(c1.attributes[2]!.name).toBe(name2)
    expect(c1.attributes[3]!.name).toBe(name3)
  })

  it("update works as expected", () => {
    const { dataset: dataContext, a1 } = setupTestDataset()
    const cid = "new cid"
    const name = "new name"
    const title = "new title"
    const description = "new description"
    const unit = "new unit"
    const formula = "new formula"
    const editable = false
    const type = "qualitative"
    const precision = 10
    const result = handler.update?.({ attribute: a1, dataContext },
      { cid, name, title, description, unit, formula, editable, type, precision })
    expect(result?.success).toBe(true)
    const values = result?.values as DIResultAttributes
    const resultAttr = values.attrs?.[0]
    expect(resultAttr?.cid).toBe(cid)
    expect(a1.cid).toBe(cid)
    expect(resultAttr?.name).toBe(name)
    expect(a1.name).toBe(name)
    expect(resultAttr?.title).toBe(title)
    expect(a1.title).toBe(title)
    expect(resultAttr?.description).toBe(description)
    expect(a1.description).toBe(description)
    expect(resultAttr?.unit).toBe(unit)
    expect(a1.units).toBe(unit)
    expect(resultAttr?.formula).toBe(formula)
    expect(a1.formula?.display).toBe(formula)
    expect(resultAttr?.type).toBe(type)
    expect(a1.type).toBe(type)
    expect(resultAttr?.precision).toBe(precision)
    expect(a1.precision).toBe(precision)

    const result2 = handler.update?.({ attribute: a1, dataContext }, { type: "fake type" })
    const values2 = result2?.values as DIResultAttributes
    const resultAttr2 = values2.attrs?.[0]
    expect(resultAttr2?.type).toBe(type)
  })

  it("delete works as expected", () => {
    const attribute = Attribute.create({ name: "name" })
    const dataContext = DataSet.create({}, {historyService: new AppHistoryService()})
    dataContext.addAttribute(attribute)
    expect(dataContext.attributes.length).toBe(1)
    expect(handler.delete?.({ dataContext }).success).toEqual(false)
    expect(dataContext.attributes.length).toBe(1)
    expect(handler.delete?.({ dataContext, attribute }).success).toEqual(true)
    expect(dataContext.attributes.length).toBe(0)
  })
})
