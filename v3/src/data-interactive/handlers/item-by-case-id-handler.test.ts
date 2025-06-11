import { toV2Id } from "../../utilities/codap-utils"
import { DIFullCase, DIItem, DIUpdateItemResult } from "../data-interactive-data-set-types"
import { setupTestDataset } from "../../test/dataset-test-utils"
import { diItemByCaseIDHandler } from "./item-by-case-id-handler"


describe("DataInteractive ItemByCaseIDHandler", () => {
  const handler = diItemByCaseIDHandler

  it("delete works", () => {
    const { dataset: dataContext } = setupTestDataset()
    const itemByCaseID = dataContext.getItemAtIndex(0)!
    const itemId = itemByCaseID.__id__

    expect(handler.delete?.({ dataContext }).success).toBe(false)
    expect(handler.delete?.({ itemByCaseID }).success).toBe(false)

    expect(dataContext.getItem(itemId)).toBeDefined()
    const result = handler.delete!({ dataContext, itemByCaseID })
    expect(result?.success).toBe(true)
    const values = result.values as number[]
    expect(values[0]).toBe(toV2Id(itemId))
    expect(dataContext.getItem(itemId)).toBeUndefined()
  })

  it("get works", () => {
    const { dataset: dataContext, a1 } = setupTestDataset()
    const itemByCaseID = dataContext.getItemAtIndex(0)!

    expect(handler.get?.({ dataContext }).success).toBe(false)
    expect(handler.get?.({ itemByCaseID }).success).toBe(false)

    const result = handler.get!({ dataContext, itemByCaseID })
    expect(result.success).toBe(true)
    const values = result.values as DIFullCase
    expect(values.id).toBe(toV2Id(itemByCaseID.__id__))
    expect(Object.keys(values.values!).length).toBe(4)
    expect(values.values?.a1).toBe(a1.value(0))
  })

  it("update works", () => {
    const { dataset: dataContext, a1, } = setupTestDataset()
    const itemByCaseID = dataContext.getItemAtIndex(0)!
    const itemId = itemByCaseID.__id__
    const values = { a1: "c" } as DIItem

    expect(handler.update?.({ itemByCaseID }, values).success).toBe(false)
    expect(handler.update?.({ dataContext }, values).success).toBe(false)
    expect(handler.update?.({ dataContext, itemByCaseID }).success).toBe(false)

    expect(a1.value(0)).toBe("a")
    const singleResult = handler.update!({ dataContext, itemByCaseID }, values)
    expect(singleResult.success).toBe(true)
    expect(a1.value(0)).toBe("c")
    const singleValues = singleResult.values as DIUpdateItemResult
    expect(singleValues.changedCases?.[0]).toBe(toV2Id(itemId))
  })
})
