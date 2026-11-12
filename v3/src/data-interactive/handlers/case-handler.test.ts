import { toV2Id, toV3CaseId, toV3ItemId } from "../../utilities/codap-utils"
import { DISuccessResult, DIValues } from "../data-interactive-types"
import { DINewCase } from "../data-interactive-data-set-types"
import { diCaseHandler } from "./case-handler"
import { setupTestDataset } from "../../test/dataset-test-utils"

describe("DataInteractive CaseHandler", () => {
  const handler = diCaseHandler

  it("create works as expected", () => {
    const { dataset, c1, c2 } = setupTestDataset()
    const c3 = dataset.collections[2]

    const oldCaseIds = new Set(Array.from(dataset.caseInfoMap.values()).map(aCase => toV2Id(aCase.groupedCase.__id__)))
    let itemIdsBefore = new Set<string>()
    const newItemIds = () => dataset.itemIds.filter(id => !itemIdsBefore.has(id)).map(id => toV2Id(id))
    const noteItems = () => { itemIdsBefore = new Set(dataset.itemIds) }
    const confirmNewCase = (newCase: DINewCase) => {
      expect(newCase.id).toBeDefined()
      expect(oldCaseIds.has(newCase.id!)).toBe(false)
      expect(dataset.caseInfoMap.get(toV3CaseId(newCase.id!))).toBeDefined()
      // as in V2, each case is reported with the id of a new item it contains
      expect(newItemIds()).toContain(newCase.itemID)
      expect(dataset.getItemCaseIds(toV3ItemId(newCase.itemID!))).toContain(toV3CaseId(newCase.id!))
    }

    expect(handler.create?.({}).success).toBe(false)

    // Creating child cases under an existing parent
    expect(dataset.items.length).toBe(6)
    expect(dataset.getCasesForCollection(c3.id).length).toBe(6)
    const targetParentCase = dataset.getCasesForCollection(c2.id)[0]
    noteItems()
    const result = handler.create?.({ dataContext: dataset, collection: c3 }, [
      { parent: toV2Id(targetParentCase.__id__), values: { a3: 7 } },
      { parent: toV2Id(targetParentCase.__id__), values: { a3: 8 } }
    ] as DIValues)
    expect(result?.success).toBe(true)
    expect(dataset.items.length).toBe(8)
    expect(dataset.getCasesForCollection(c3.id).length).toBe(8)
    const newCases = result?.values as DINewCase[]
    expect(newCases).toHaveLength(2)
    newCases.forEach(confirmNewCase)

    // creating a single top-level case reports only the case in the collection named
    noteItems()
    const result2 = handler.create?.({ dataContext: dataset, collection: c1 }, {
      values: { a1: "d", a2: "d", a3: 8 }
    })
    expect(result2?.success).toBe(true)
    expect(dataset.items.length).toBe(9)
    expect(dataset.getCasesForCollection(c1.id).length).toBe(3)
    const newCases2 = result2?.values as DINewCase[]
    expect(newCases2).toHaveLength(1)
    newCases2.forEach(confirmNewCase)
    expect(newCases2.map(({ itemID }) => itemID)).toEqual(newItemIds())

    // a top-level case ignores any parent (V2 failed for one that named no case)
    const result3 = handler.create?.({ dataContext: dataset, collection: c1 }, { parent: 12345, values: { a1: "e" } })
    expect(result3?.success).toBe(true)
    expect(dataset.getCasesForCollection(c1.id).length).toBe(4)
  })

  it("create and update need a collection, as in V2", () => {
    const { dataset } = setupTestDataset()
    const collectionNotFound = { success: false, values: { error: "Collection not found" } }
    expect(handler.create?.({ dataContext: dataset }, { values: { a1: "c", a2: "c", a3: 7 } }))
      .toEqual(collectionNotFound)
    expect(dataset.items.length).toBe(6)
    expect(handler.update?.({ dataContext: dataset }, { id: toV2Id(dataset.itemIds[0]), values: { a3: 10 } }))
      .toEqual(collectionNotFound)
  })

  it("creates nothing below the top level without an existing parent, as in V2", () => {
    const { dataset, c1, c2 } = setupTestDataset()
    const parentInvalid = { success: false, values: { error: "Cannot create case with invalid or deleted parent" } }
    // no parent, an unknown parent, and a parent that isn't in the parent collection
    const c3Case = dataset.getCasesForCollection(dataset.collections[2].id)[0]
    expect(handler.create?.({ dataContext: dataset, collection: c2 }, { values: { a2: "q" } })).toEqual(parentInvalid)
    expect(handler.create?.({ dataContext: dataset, collection: c2 }, { parent: 12345, values: { a2: "q" } }))
      .toEqual(parentInvalid)
    expect(handler.create?.({ dataContext: dataset, collection: c2 },
      { parent: toV2Id(c3Case.__id__), values: { a2: "q" } })).toEqual(parentInvalid)
    expect(dataset.items.length).toBe(6)

    // a request with some valid parents creates those cases and skips the rest
    const parent = toV2Id(dataset.getCasesForCollection(c1.id)[0].__id__)
    const result = handler.create?.({ dataContext: dataset, collection: c2 },
      [{ parent, values: { a2: "q" } }, { parent: 12345, values: { a2: "r" } }] as DIValues)
    expect(result?.success).toBe(true)
    expect(result?.values as DINewCase[]).toHaveLength(1)
    expect(dataset.items.length).toBe(7)
  })

  it("creates an empty case for a case object with no values, as in V2", () => {
    const { dataset, c1, c2 } = setupTestDataset()
    const parent = toV2Id(dataset.getCasesForCollection(c1.id)[0].__id__)
    const childCount = dataset.getCasesForCollection(c2.id).length
    const result = handler.create?.({ dataContext: dataset, collection: c2 }, [{ parent }] as DIValues)
    expect(result?.success).toBe(true)
    expect(result?.values as DINewCase[]).toHaveLength(1)
    expect(dataset.getCasesForCollection(c2.id).length).toBe(childCount + 1)

    const topCount = dataset.getCasesForCollection(c1.id).length
    expect(handler.create?.({ dataContext: dataset, collection: c1 }, [{}] as DIValues)?.success).toBe(true)
    expect(dataset.getCasesForCollection(c1.id).length).toBe(topCount + 1)
  })

  it("fills a new parent's empty child case, but not a real child case whose values were cleared", () => {
    const { dataset, c1, c2 } = setupTestDataset()
    const a1 = dataset.getAttributeByName("a1")!
    const a2 = dataset.getAttributeByName("a2")!

    // a parent created on its own has one empty child case, which the first child case fills
    const parentResult = handler.create?.({ dataContext: dataset, collection: c1 }, { values: { a1: "p" } })
    const parent = (parentResult?.values as DINewCase[])[0].id!
    const emptyChildCaseId = dataset.caseInfoMap.get(toV3CaseId(parent))!.childCaseIds![0]
    const itemCount = dataset.items.length
    const childResult = handler.create?.({ dataContext: dataset, collection: c2 },
      // a value for the parent collection is ignored, so the parent case doesn't change
      { parent, values: { a1: "changed", a2: "q" } })
    expect(childResult?.success).toBe(true)
    expect(dataset.items.length).toBe(itemCount)
    // the filled case is reported as created
    expect(childResult?.values).toEqual([expect.objectContaining({ id: toV2Id(emptyChildCaseId) })])
    expect(dataset.getStrValue(emptyChildCaseId, a2.id)).toBe("q")
    expect(dataset.getStrValue(toV3CaseId(parent), a1.id)).toBe("p")

    // a parent with two child cases, one of them cleared, gets a new case rather than reusing the cleared one
    const bParent = dataset.getCasesForCollection(c1.id)[1]
    const bChildItem = dataset.caseInfoMap.get(bParent.__id__)!.childItemIds[0]
    const clearedValues = Object.fromEntries(["a2", "a3", "a4"].map(name => [dataset.attrIDFromName(name)!, ""]))
    dataset.setCaseValues([{ __id__: bChildItem, ...clearedValues }])
    dataset.validateCases()
    const bItemCount = dataset.items.length
    expect(handler.create?.({ dataContext: dataset, collection: c2 },
      { parent: toV2Id(bParent.__id__), values: { a2: "s" } })?.success).toBe(true)
    expect(dataset.items.length).toBe(bItemCount + 1)
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

  it("fills a new parent's empty child case only once", () => {
    const { dataset, c1, c2 } = setupTestDataset()
    const parentResult = handler.create?.({ dataContext: dataset, collection: c1 }, { values: { a1: "p" } })
    const parent = (parentResult?.values as DINewCase[])[0].id!
    const itemCount = dataset.items.length
    // the first child, created with no values, fills the empty case; the next ones are new cases
    const ids = [{ parent }, { parent, values: { a2: "y" } }, { parent, values: { a2: "z" } }].map(aCase =>
      (handler.create?.({ dataContext: dataset, collection: c2 }, aCase as DIValues)?.values as DINewCase[])[0].id)
    expect(new Set(ids).size).toBe(3)
    expect(dataset.items.length).toBe(itemCount + 2)
  })

  it("fills a new parent's empty child case even when a lower collection has a formula", () => {
    const { dataset, c1, c2 } = setupTestDataset()
    const formulaAttr = dataset.addAttribute({ name: "f", formula: { display: "1" } }, { collection: c2.id })
    const parentResult = handler.create?.({ dataContext: dataset, collection: c1 }, { values: { a1: "p" } })
    const parent = (parentResult?.values as DINewCase[])[0].id!
    const [itemId] = dataset.caseInfoMap.get(toV3CaseId(parent))!.childItemIds
    dataset.setComputedCaseValues([{ __id__: itemId, [formulaAttr.id]: 1 }], [formulaAttr.id])
    const itemCount = dataset.items.length
    expect(handler.create?.({ dataContext: dataset, collection: c2 }, { parent, values: { a2: "q" } })?.success)
      .toBe(true)
    expect(dataset.items.length).toBe(itemCount)
  })

  it("accepts a parent in any collection above, as in V2", () => {
    const { dataset, c1 } = setupTestDataset()
    const c3 = dataset.collections[2]
    const grandparent = toV2Id(dataset.getCasesForCollection(c1.id)[0].__id__)
    const itemCount = dataset.items.length
    const result = handler.create?.({ dataContext: dataset, collection: c3 },
      { parent: grandparent, values: { a3: 99 } })
    expect(result?.success).toBe(true)
    expect(dataset.items.length).toBe(itemCount + 1)
  })

  it("update works as expected", () => {
    const { dataset } = setupTestDataset()
    const collection = dataset.collections[2]

    expect(handler.update?.({}).success).toBe(false)
    expect(handler.update?.({ dataContext: dataset, collection }, {}).success).toBe(false)

    // Update single case
    const caseId0 = dataset.items[0].__id__
    const result = handler.update?.({ dataContext: dataset, collection }, { id: toV2Id(caseId0), values: { a3: 10 } })
    expect(result?.success).toBe(true)
    expect(dataset.getAttributeByName("a3")?.value(0)).toBe(10)
    expect((result as DISuccessResult).caseIDs?.includes(toV2Id(caseId0))).toBe(true)

    // Update multiple cases
    const caseId1 = dataset.items[1].__id__
    const caseId2 = dataset.items[2].__id__
    const result2 = handler.update?.({ dataContext: dataset, collection }, [
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

    // as in V2, a case sent with no values is still listed
    const caseId3 = dataset.items[3].__id__
    const result3 = handler.update?.({ dataContext: dataset, collection }, [
      { id: toV2Id(caseId3) }, { id: toV2Id(caseId1), values: { a2: "v" } }
    ] as DIValues)
    expect((result3 as DISuccessResult).caseIDs).toEqual([toV2Id(caseId3), toV2Id(caseId1)])
  })
})
