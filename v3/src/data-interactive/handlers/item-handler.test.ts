import { toV2Id } from "../../utilities/codap-utils"
import { DISuccessResult } from "../data-interactive-types"
import { DIFullCase, DIItem, DIUpdateItemResult } from "../data-interactive-data-set-types"
import { setupTestDataset } from "../../test/dataset-test-utils"
import { diItemHandler } from "./item-handler"


describe("DataInteractive ItemHandler", () => {
  const handler = diItemHandler

  it("create works", () => {
    const { dataset, a1 } = setupTestDataset()

    expect(handler.create?.({}).success).toBe(false)

    const resources = { dataContext: dataset }
    expect(handler.create?.(resources).success).toBe(false)

    // Create a single item
    const result1 = handler.create?.(resources, { a1: "d", a2: "w", a3: 7 } as DIItem) as DISuccessResult
    expect(result1.success).toBe(true)
    expect(result1.itemIDs?.length).toBe(1)
    expect(result1.itemIDs?.[0]).toBe(toV2Id(dataset.items[6].__id__))

    // Create multiple items
    const result2 = handler.create?.(resources, [
      { a1: "e", a2: "v", a3: 8 },
      { a1: "f", a2: "u", a3: 9 }
    ] as DIItem[]) as DISuccessResult
    expect(result2.success).toBe(true)
    expect(result2.itemIDs?.length).toBe(2)
    expect(result2.itemIDs?.[0]).toBe(toV2Id(dataset.items[7].__id__))
    expect(result2.itemIDs?.[1]).toBe(toV2Id(dataset.items[8].__id__))

    // Create item in Collaborative format
    const id = "testId123"
    const result3 = handler.create?.(resources, { id, values: { a1: "g", a2: "t", a3: 10 } }) as DISuccessResult
    expect(result3?.success).toBe(true)
    expect(result3.itemIDs?.length).toBe(1)
    expect(dataset.items[9].__id__).toBe(id)
    expect(result3.itemIDs?.[0]).toBe(toV2Id(id))
    expect(a1.value(9)).toBe("g")
  })

  it("delete works", () => {
    const { dataset: dataContext } = setupTestDataset()
    const item = dataContext.getItemAtIndex(0)!
    const itemId = item.__id__

    expect(handler.delete?.({ dataContext }).success).toBe(false)
    expect(handler.delete?.({ item }).success).toBe(false)

    expect(dataContext.getItem(itemId)).toBeDefined()
    const result = handler.delete!({ dataContext, item })
    expect(result?.success).toBe(true)
    const values = result.values as number[]
    expect(values[0]).toBe(toV2Id(itemId))
    expect(dataContext.getItem(itemId)).toBeUndefined()

    const item2Id = dataContext.getItemAtIndex(2)!.__id__
    const item3Id = dataContext.getItemAtIndex(3)!.__id__
    const resultMultiple = handler.delete!({ dataContext }, [{ id: toV2Id(item2Id) }, { id: toV2Id(item3Id) }])
    expect(resultMultiple?.success).toBe(true)
    expect(dataContext.getItem(item2Id)).toBeUndefined()
    expect(dataContext.getItem(item3Id)).toBeUndefined()
  })

  it("get works", () => {
    const { dataset: dataContext, a1 } = setupTestDataset()
    const item = dataContext.getItemAtIndex(0)!

    expect(handler.get?.({ dataContext }).success).toBe(false)
    expect(handler.get?.({ item }).success).toBe(false)

    const result = handler.get!({ dataContext, item })
    expect(result.success).toBe(true)
    const values = result.values as DIFullCase
    expect(values.id).toBe(toV2Id(item.__id__))
    expect(Object.keys(values.values!).length).toBe(4)
    expect(values.values?.a1).toBe(a1.value(0))
  })

  it("update works", () => {
    const { dataset: dataContext, a1, a2 } = setupTestDataset()
    const item = dataContext.getItemAtIndex(0)!
    const itemId = item.__id__
    const values = { a1: "c" } as DIItem

    expect(handler.update?.({ item }, values).success).toBe(false)
    expect(handler.update?.({ dataContext, item }).success).toBe(false)

    // Update a single item by index
    expect(a1.value(0)).toBe("a")
    const singleResult = handler.update!({ dataContext, item }, values)
    expect(singleResult.success).toBe(true)
    expect(a1.value(0)).toBe("c")
    const singleValues = singleResult.values as DIUpdateItemResult
    expect(singleValues.changedCases?.[0]).toBe(toV2Id(itemId))

    // Update multiple items by id
    const item2 = dataContext.getItemAtIndex(1)!
    const item2Id = item2.__id__
    expect(a2.value(0)).toBe("x")
    expect(a2.value(1)).toBe("y")
    const multipleResult = handler.update!({ dataContext }, [
      { id: toV2Id(itemId), values: { a2: "q" } },
      { id: toV2Id(item2Id), values: { a2: "q" } }
    ])
    expect(multipleResult.success).toBe(true)
    expect(a2.value(0)).toBe("q")
    expect(a2.value(1)).toBe("q")
    const multipleValues = multipleResult.values as DIUpdateItemResult
    expect(multipleValues.changedCases?.includes(toV2Id(itemId))).toBe(true)
    expect(multipleValues.changedCases?.includes(toV2Id(item2Id))).toBe(true)
  })
})
