import { DIAllCases } from "../data-interactive-data-set-types"
import { diAllCasesHandler } from "./all-cases-handler"
import { setupTestDataset, testCases } from "../../test/dataset-test-utils"

describe("DataInteractive AllCasesHandler", () => {
  const handler = diAllCasesHandler

  it("delete works as expected", () => {
    const { dataset } = setupTestDataset()
    expect(dataset.items.length).toBe(testCases.length)
    expect(handler.delete?.({ dataContext: dataset })?.success).toBe(true)
    expect(dataset.items.length).toBe(0)
  })
  it("get works as expected", () => {
    const { dataset, c1, c2 } = setupTestDataset()

    interface GetAllCasesResult {
      success: boolean,
      values: DIAllCases
    }
    const getCase = (result: GetAllCasesResult, index: number) =>
      result.values.cases![index].case!
    const checkCase = (c: any, attribute: string, value: number | string, children: number, parent?: number) => {
      expect(c.values[attribute]).toBe(value)
      expect(c.children.length).toBe(children)
      expect(c.parent).toBe(parent)
    }

    const result1 = handler.get?.({ dataContext: dataset, collection: c1 }) as GetAllCasesResult
    expect(result1.success).toBe(true)
    expect(result1.values.cases?.length).toBe(2)
    const c1c1 = getCase(result1, 0)
    checkCase(c1c1, "a1", "a", 2)
    const c1c2 = getCase(result1, 1)
    checkCase(c1c2, "a1", "b", 2)

    const result2 = handler.get?.({ dataContext: dataset, collection: c2 }) as GetAllCasesResult
    expect(result2.success).toBe(true)
    expect(result2.values.cases?.length).toBe(4)
    const c2c1 = getCase(result2, 0)
    checkCase(c2c1, "a2", "x", 2, c1c1.id)
    const c2c2 = getCase(result2, 1)
    checkCase(c2c2, "a2", "z", 1, c1c1.id)
    const c2c3 = getCase(result2, 2)
    checkCase(c2c3, "a2", "y", 2, c1c2.id)
    const c2c4 = getCase(result2, 3)
    checkCase(c2c4, "a2", "z", 1, c1c2.id)

    const result3 = handler.get?.({ dataContext: dataset, collection: dataset?.childCollection }) as GetAllCasesResult
    expect(result3.success).toBe(true)
    expect(result3.values.cases?.length).toBe(6)
    checkCase(getCase(result3, 0), "a3", 1, 0, c2c1.id)
    checkCase(getCase(result3, 1), "a3", 5, 0, c2c1.id)
    checkCase(getCase(result3, 2), "a3", 3, 0, c2c2.id)
    checkCase(getCase(result3, 3), "a3", 2, 0, c2c3.id)
    checkCase(getCase(result3, 4), "a3", 6, 0, c2c3.id)
    checkCase(getCase(result3, 5), "a3", 4, 0, c2c4.id)
  })
})
