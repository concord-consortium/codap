import { toV2Id } from "../../utilities/codap-utils"
import { DIFullCase } from "../data-interactive-data-set-types"
import { setupTestDataset } from "../../test/dataset-test-utils"
import { diItemSearchHandler } from "./item-search-handler"


describe("DataInteractive ItemSearchHandler", () => {
  const handler = diItemSearchHandler

  it("delete works", () => {
    const { dataset: dataContext } = setupTestDataset()
    const itemSearch = [dataContext.items[0], dataContext.items[2], dataContext.items[5]]
    const itemIds = itemSearch.map(item => item.__id__)

    expect(handler.delete?.({ dataContext }).success).toBe(false)
    expect(handler.delete?.({ itemSearch }).success).toBe(false)

    itemIds.forEach(id => expect(dataContext.getItem(id)).toBeDefined())
    expect(dataContext.items.length).toBe(6)
    const result = handler.delete!({ dataContext, itemSearch })
    expect(result?.success).toBe(true)
    expect(dataContext.items.length).toBe(3)
    itemIds.forEach(id => expect(dataContext.getItem(id)).toBeUndefined())
    const values = result.values as number[]
    itemIds.forEach(id => expect(values.includes(toV2Id(id))).toBe(true))
  })

  it("get works", () => {
    const { dataset: dataContext } = setupTestDataset()
    const itemSearch = [dataContext.items[0], dataContext.items[2], dataContext.items[5]]

    expect(handler.get?.({ dataContext }).success).toBe(false)
    expect(handler.get?.({ itemSearch }).success).toBe(false)

    const result = handler.get!({ dataContext, itemSearch })
    expect(result.success).toBe(true)
    const values = result.values as DIFullCase[]
    itemSearch.forEach((item, index) => {
      expect(values[index].id).toBe(toV2Id(item.__id__))
      const itemIndex = dataContext.getItemIndex(item.__id__)!
      dataContext.attributes.forEach(
        attribute => expect(values[index].values?.[attribute.name]).toBe(attribute.value(itemIndex))
      )
    })
  })

  it("notify works", () => {
    const { dataset: dataContext } = setupTestDataset()
    const item = dataContext.items[1]
    const itemSearch = [item]
    const last = { itemOrder: "last" }
    const notify = handler.notify!

    expect(notify({ itemSearch }, last).success).toBe(false)
    expect(notify({ dataContext }, last).success).toBe(false)
    expect(notify({ dataContext, itemSearch }).success).toBe(false)
    expect(notify({ dataContext, itemSearch }, {}).success).toBe(false)

    expect(notify({ dataContext, itemSearch }, last).success).toBe(true)
    expect(dataContext.itemIds[dataContext.itemIds.length - 1]).toBe(item.__id__)

    expect(notify({ dataContext, itemSearch }, { itemOrder: "first" }).success).toBe(true)
    expect(dataContext.itemIds[0]).toBe(item.__id__)

    expect(notify({ dataContext, itemSearch }, { itemOrder: [1] }).success).toBe(true)
    expect(dataContext.itemIds[1]).toBe(item.__id__)
  })
})
