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
    // as in v2, a single 0 is refused like a missing itemOrder and leaves the order unchanged
    const priorItemIds = Array.from(dataContext.itemIds)
    expect(notify({ dataContext, itemSearch }, { itemOrder: 0 }).success).toBe(false)
    expect(dataContext.itemIds).toEqual(priorItemIds)

    expect(notify({ dataContext, itemSearch }, last).success).toBe(true)
    expect(dataContext.itemIds[dataContext.itemIds.length - 1]).toBe(item.__id__)

    expect(notify({ dataContext, itemSearch }, { itemOrder: "first" }).success).toBe(true)
    expect(dataContext.itemIds[0]).toBe(item.__id__)

    expect(notify({ dataContext, itemSearch }, { itemOrder: [1] }).success).toBe(true)
    expect(dataContext.itemIds[1]).toBe(item.__id__)

    expect(notify({ dataContext, itemSearch }, { itemOrder: [2] }).success).toBe(true)
    expect(notify({ dataContext, itemSearch }, { itemOrder: [0] }).success).toBe(true)
    expect(dataContext.itemIds[0]).toBe(item.__id__)
    // positions are converted to numbers
    expect(notify({ dataContext, itemSearch }, { itemOrder: ["3"] } as any).success).toBe(true)
    expect(dataContext.itemIds[3]).toBe(item.__id__)
    expect(notify({ dataContext, itemSearch }, { itemOrder: [""] } as any).success).toBe(true)
    expect(dataContext.itemIds[0]).toBe(item.__id__)
    // an item with no position stays where it is, as in v2
    expect(notify({ dataContext, itemSearch }, { itemOrder: [2] }).success).toBe(true)
    expect(notify({ dataContext, itemSearch }, { itemOrder: [null] } as any).success).toBe(true)
    expect(dataContext.itemIds[2]).toBe(item.__id__)
  })

  it("notify moves the matching items when an item is set aside", () => {
    const { dataset: dataContext, a3 } = setupTestDataset()
    const notify = handler.notify!
    const a3Values = () => dataContext.items.map(({ __id__ }) => dataContext.getNumeric(__id__, a3.id))
    dataContext.hideCasesOrItems([dataContext.itemIds[1]])
    dataContext.validateCases()
    expect(a3Values()).toEqual([1, 3, 4, 5, 6])

    const fifth = dataContext.items[3]
    expect(notify({ dataContext, itemSearch: [fifth] }, { itemOrder: "first" }).success).toBe(true)
    expect(a3Values()).toEqual([5, 1, 3, 4, 6])

    const sixth = dataContext.items[4]
    expect(notify({ dataContext, itemSearch: [sixth] }, { itemOrder: "first" }).success).toBe(true)
    expect(a3Values()).toEqual([6, 5, 1, 3, 4])

    expect(notify({ dataContext, itemSearch: [fifth] }, { itemOrder: "last" }).success).toBe(true)
    expect(a3Values()).toEqual([6, 1, 3, 4, 5])

    dataContext.showHiddenCasesAndItems()
    dataContext.validateCases()
    expect(a3Values()).toEqual([6, 1, 2, 3, 4, 5])
  })

  it("notify moves items ahead of a set-aside item at the start with \"first\"", () => {
    const { dataset: dataContext, a3 } = setupTestDataset()
    const notify = handler.notify!
    const a3Values = () => dataContext.items.map(({ __id__ }) => dataContext.getNumeric(__id__, a3.id))
    dataContext.hideCasesOrItems([dataContext.itemIds[0]])
    dataContext.validateCases()
    expect(a3Values()).toEqual([2, 3, 4, 5, 6])

    const fourth = dataContext.items[2]
    expect(notify({ dataContext, itemSearch: [fourth] }, { itemOrder: "first" }).success).toBe(true)
    expect(a3Values()).toEqual([4, 2, 3, 5, 6])

    // the moved item is ahead of the set-aside item once it is restored, as in v2
    dataContext.showHiddenCasesAndItems()
    dataContext.validateCases()
    expect(a3Values()).toEqual([4, 1, 2, 3, 5, 6])
  })

  it("notify places each itemOrder position as v2 did", () => {
    const notify = handler.notify!
    // moves the items whose a3 values are given and returns the a3 values in item order
    const move = (a3Moved: number[], itemOrder: unknown) => {
      const { dataset: dataContext, a3 } = setupTestDataset()
      const a3Value = (id: string) => dataContext.getNumeric(id, a3.id)
      const itemSearch = dataContext.items.filter(({ __id__ }) => a3Moved.includes(a3Value(__id__)!))
      expect(notify({ dataContext, itemSearch }, { itemOrder } as any).success).toBe(true)
      return dataContext.items.map(({ __id__ }) => a3Value(__id__))
    }
    // a fraction is truncated
    expect(move([6], [1.5])).toEqual([1, 6, 2, 3, 4, 5])
    expect(move([6], [-1.5])).toEqual([1, 2, 3, 4, 6, 5])
    // a negative position counts from the end
    expect(move([6], [-1])).toEqual([1, 2, 3, 4, 6, 5])
    expect(move([6], [-99])).toEqual([6, 1, 2, 3, 4, 5])
    // a position past the end is the end
    expect(move([1], [99])).toEqual([2, 3, 4, 5, 6, 1])
    // text that isn't a number is the start
    expect(move([6], ["abc"])).toEqual([6, 1, 2, 3, 4, 5])
    // "first" and "last" in the array are the start and the end
    expect(move([6], ["first"])).toEqual([6, 1, 2, 3, 4, 5])
    expect(move([1], ["last"])).toEqual([2, 3, 4, 5, 6, 1])
    // each "first" moves its item to the start in turn, so they end up reversed
    expect(move([5, 6], ["first", "first"])).toEqual([6, 5, 1, 2, 3, 4])
    // a single position applies to every item, one after another
    expect(move([5, 6], 2)).toEqual([1, 2, 6, 5, 3, 4])
  })

  it("notify counts set-aside items in itemOrder positions, as v2 did", () => {
    const { dataset: dataContext, a3 } = setupTestDataset()
    const notify = handler.notify!
    const a3Values = () => dataContext.items.map(({ __id__ }) => dataContext.getNumeric(__id__, a3.id))
    dataContext.hideCasesOrItems([dataContext.itemIds[1]])
    dataContext.validateCases()
    expect(a3Values()).toEqual([1, 3, 4, 5, 6])

    const sixth = dataContext.items[4]
    expect(notify({ dataContext, itemSearch: [sixth] }, { itemOrder: [1] }).success).toBe(true)
    expect(a3Values()).toEqual([1, 6, 3, 4, 5])

    // position 1 is ahead of the set-aside item, which comes back after the moved one
    dataContext.showHiddenCasesAndItems()
    dataContext.validateCases()
    expect(a3Values()).toEqual([1, 6, 2, 3, 4, 5])
  })
})
