import { toV2Id } from "../../utilities/codap-utils"
import { DIFullCase, DIItem, DIUpdateItemResult } from "../data-interactive-data-set-types"
import { setupTestDataset } from "../../test/dataset-test-utils"
import { diItemByIDHandler } from "./item-by-id-handler"


describe("DataInteractive ItemByIDHandler", () => {
  const handler = diItemByIDHandler

  it("delete works", () => {
    const { dataset: dataContext } = setupTestDataset()
    const itemByID = dataContext.getItemAtIndex(0)!
    const itemId = itemByID.__id__

    expect(handler.delete?.({ dataContext }).success).toBe(false)
    expect(handler.delete?.({ itemByID }).success).toBe(false)

    expect(dataContext.getItem(itemId)).toBeDefined()
    const result = handler.delete!({ dataContext, itemByID })
    expect(result?.success).toBe(true)
    const values = result.values as number[]
    expect(values[0]).toBe(toV2Id(itemId))
    expect(dataContext.getItem(itemId)).toBeUndefined()
  })

  it("get works", () => {
    const { dataset: dataContext, a1 } = setupTestDataset()
    const itemByID = dataContext.getItemAtIndex(0)!

    expect(handler.get?.({ dataContext }).success).toBe(false)
    expect(handler.get?.({ itemByID }).success).toBe(false)

    const result = handler.get!({ dataContext, itemByID })
    expect(result.success).toBe(true)
    const values = result.values as DIFullCase
    expect(values.id).toBe(toV2Id(itemByID.__id__))
    expect(Object.keys(values.values!).length).toBe(4)
    expect(values.values?.a1).toBe(a1.value(0))
  })

  it("update works", () => {
    const { dataset: dataContext, a1 } = setupTestDataset()
    const itemByID = dataContext.getItemAtIndex(0)!
    const itemId = itemByID.__id__
    const values = { a1: "c" } as DIItem

    expect(handler.update?.({ itemByID }, values).success).toBe(false)
    expect(handler.update?.({ dataContext }, values).success).toBe(false)
    expect(handler.update?.({ dataContext, itemByID }).success).toBe(false)

    expect(a1.value(0)).toBe("a")
    const singleResult = handler.update!({ dataContext, itemByID }, values)
    expect(singleResult.success).toBe(true)
    expect(a1.value(0)).toBe("c")
    const singleValues = singleResult.values as DIUpdateItemResult
    expect(singleValues.changedCases?.[0]).toBe(toV2Id(itemId))
  })
})
