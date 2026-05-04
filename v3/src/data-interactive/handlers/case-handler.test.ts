import { toV2Id, toV3CaseId } from "../../utilities/codap-utils"
import { DISuccessResult, DIValues } from "../data-interactive-types"
import { DINewCase } from "../data-interactive-data-set-types"
import { diCaseHandler } from "./case-handler"
import { setupTestDataset } from "../../test/dataset-test-utils"

describe("DataInteractive CaseHandler", () => {
  const handler = diCaseHandler

  it("create works as expected", () => {
    const { dataset, c1, c2 } = setupTestDataset()

    const oldCaseIds = new Set(Array.from(dataset.caseInfoMap.values()).map(aCase => toV2Id(aCase.groupedCase.__id__)))
    const confirmNewCase = (newCase: DINewCase) => {
      expect(newCase.id).toBeDefined()
      expect(oldCaseIds.has(newCase.id!)).toBe(false)
      expect(dataset.caseInfoMap.get(toV3CaseId(newCase.id!))).toBeDefined()
    }

    expect(handler.create?.({}).success).toBe(false)

    // Creating multiple cases
    expect(dataset.items.length).toBe(6)
    expect(dataset.getCasesForCollection(c2.id).length).toBe(4)
    const targetParentCase = dataset.getCasesForCollection(c2.id)[0]
    const result = handler.create?.({ dataContext: dataset }, [
      { values: { a1: "c", a2: "c", a3: 7 } },
      {
        parent: toV2Id(targetParentCase.__id__),
        values: { a3: 8 }
      }
    ] as DIValues)
    expect(result?.success).toBe(true)
    expect(dataset.items.length).toBe(8)
    expect(dataset.getCasesForCollection(c2.id).length).toBe(5)
    const newCases = result?.values as DINewCase[]
    newCases.forEach(confirmNewCase)

    // creating a single parent case
    const result2 = handler.create?.({ dataContext: dataset, collection: c1 }, {
      values: { a1: "d", a2: "d", a3: 8 }
    })
    expect(result2?.success).toBe(true)
    expect(dataset.items.length).toBe(9)
    expect(dataset.getCasesForCollection(c1.id).length).toBe(4)
    expect(dataset.getCasesForCollection(c2.id).length).toBe(6)
    const newCases2 = result2?.values as DINewCase[]
    newCases2.forEach(confirmNewCase)

    // Creating a single child case
    const result3 = handler.create?.({ dataContext: dataset },
      {
        parent: dataset.getCasesForCollection(c1.id)[0].__id__,
        values: { a2: "e", a3: 9 }
      }
    )
    expect(result3?.success).toBe(true)
    expect(dataset.items.length).toBe(10)
    expect(dataset.getCasesForCollection(c2.id).length).toBe(7)
    const newCases3 = result3?.values as DINewCase[]
    newCases3.forEach(confirmNewCase)
  })

  it("absorbs phantom child items when creating child cases with parent references", () => {
    // Reproduces the Scrambler plugin bug (CODAP-1151):
    // 1. Delete all cases
    // 2. Create a parent case (creates a phantom child item with no child-level values)
    // 3. Create child cases with parent references
    // Expected: child count should match the number of explicitly created children
    const { dataset, c1, c2 } = setupTestDataset()

    // Delete all cases
    dataset.removeCases(dataset.items.map(c => c.__id__))
    expect(dataset.items.length).toBe(0)

    // Create a parent case with only parent-level attribute values
    const parentResult = handler.create?.({ dataContext: dataset, collection: c1 },
      [{ values: { a1: "parent1" } }] as DIValues
    )
    expect(parentResult?.success).toBe(true)
    dataset.validateCases()

    // After creating the parent case, there should be 1 item (the phantom child)
    expect(dataset.items.length).toBe(1)
    const parentCases = dataset.getCasesForCollection(c1.id)
    expect(parentCases.length).toBe(1)
    // The phantom item also appears as a child case
    expect(dataset.getCasesForCollection(c2.id).length).toBe(1)

    // Create child cases with parent references
    const parentCaseId = toV2Id(parentCases[0].__id__)
    const childResult = handler.create?.({ dataContext: dataset, collection: c2 },
      [
        { parent: parentCaseId, values: { a2: "x", a3: 1 } },
        { parent: parentCaseId, values: { a2: "y", a3: 2 } },
        { parent: parentCaseId, values: { a2: "z", a3: 3 } }
      ] as DIValues
    )
    expect(childResult?.success).toBe(true)

    // Should have 3 items (phantom absorbed + 2 new), not 4 (phantom + 3 new)
    expect(dataset.items.length).toBe(3)
    const childCasesAfter = dataset.getCasesForCollection(c2.id)
    expect(childCasesAfter.length).toBe(3)

    // All child cases should have their values set
    const a2 = dataset.getAttributeByName("a2")!
    const a3 = dataset.getAttributeByName("a3")!
    const childValues = childCasesAfter.map(c => {
      const itemId = dataset.caseInfoMap.get(c.__id__)?.childItemIds[0]
      return {
        a2: itemId ? dataset.getStrValue(itemId, a2.id) : "",
        a3: itemId ? dataset.getStrValue(itemId, a3.id) : ""
      }
    })
    expect(childValues).toEqual([
      { a2: "x", a3: "1" },
      { a2: "y", a3: "2" },
      { a2: "z", a3: "3" }
    ])
  })

  it("update works as expected", () => {
    const { dataset } = setupTestDataset()

    expect(handler.update?.({}).success).toBe(false)
    expect(handler.update?.({ dataContext: dataset }, {}).success).toBe(false)

    // Update single case
    const caseId0 = dataset.items[0].__id__
    const result = handler.update?.({ dataContext: dataset }, { id: toV2Id(caseId0), values: { a3: 10 } })
    expect(result?.success).toBe(true)
    expect(dataset.getAttributeByName("a3")?.value(0)).toBe(10)
    expect((result as DISuccessResult).caseIDs?.includes(toV2Id(caseId0))).toBe(true)

    // Update multiple cases
    const caseId1 = dataset.items[1].__id__
    const caseId2 = dataset.items[2].__id__
    const result2 = handler.update?.({ dataContext: dataset }, [
      { id: toV2Id(caseId1), values: { a2: "w" } },
      { id: toV2Id(caseId2), values: { a1: "c", a2: "c", a3: "c" } }
    ] as DIValues)
    expect(result2?.success).toBe(true)
    expect(dataset.getAttributeByName("a2")?.value(1)).toBe("w")
    const caseIDs = (result2 as DISuccessResult).caseIDs!
    expect(caseIDs.includes(toV2Id(caseId1))).toBe(true)
    const attrs = ["a1", "a2", "a3"]
    attrs.forEach(attrName => expect(dataset.getAttributeByName(attrName)?.value(2)).toBe("c"))
    expect(caseIDs.includes(toV2Id(caseId2))).toBe(true)
  })
})
