import { DIItem, DISuccessResult } from "../data-interactive-types"
import { setupTestDataset } from "./handler-test-utils"
import { diItemHandler } from "./item-handler"


describe("DataInteractive CaseHandler", () => {
  const handler = diItemHandler

  it("create works as expected", () => {
    const { dataset } = setupTestDataset()

    expect(handler.create?.({}).success).toBe(false)

    const resources = { dataContext: dataset }
    expect(handler.create?.(resources).success).toBe(false)

    const result1 = handler.create?.(resources, { a1: "d", a2: "w", a3: 7 } as DIItem) as DISuccessResult
    expect(result1?.success).toBe(true)
    expect(result1?.itemIDs?.length).toBe(1)
    expect(result1?.itemIDs?.[0]).toBe(dataset?.cases[6].__id__)

    const result2 = handler.create?.(resources, [
      { a1: "e", a2: "v", a3: 8 },
      { a1: "f", a2: "u", a3: 9 }
    ] as DIItem[]) as DISuccessResult
    expect(result2?.success).toBe(true)
    expect(result2?.itemIDs?.length).toBe(2)
    expect(result2?.itemIDs?.[0]).toBe(dataset?.cases[7].__id__)
    expect(result2?.itemIDs?.[1]).toBe(dataset?.cases[8].__id__)
  })
})