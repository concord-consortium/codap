import { isAddCasesAction } from "../../models/data/data-set-actions"
import { IAddCasesOptions } from "../../models/data/data-set-types"
import { setupTestDataset } from "../../test/dataset-test-utils"
import { toV2Id } from "../../utilities/codap-utils"
import { onAnyAction } from "../../utilities/mst-utils"
import { DISuccessResult } from "../data-interactive-types"
import { DIFullCase, DIItem, DIItemValues, DIUpdateItemResult } from "../data-interactive-data-set-types"
import { createItemsInSegments, diItemHandler } from "./item-handler"


describe("DataInteractive ItemHandler", () => {
  const handler = diItemHandler

  it("create works", () => {
    const { dataset, a1 } = setupTestDataset()

    expect(handler.create?.({}).success).toBe(false)

    const resources = { dataContext: dataset }
    expect(handler.create?.(resources).success).toBe(false)

    // Create a single item
    const result1 = handler.create?.(resources, { a1: "d", a2: "w", a3: 7 }) as DISuccessResult
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

describe("createItemsInSegments", () => {
  it("slices itemIDs positionally per segment", () => {
    const { dataset } = setupTestDataset()
    const segments: DIItemValues[][] = [
      [{ a1: "a", a2: "x", a3: 7 }],
      [{ a1: "b", a2: "y", a3: 8 }, { a1: "a", a2: "z", a3: 9 }]
    ]
    const results = createItemsInSegments(dataset, segments) as DISuccessResult[]
    expect(results.length).toBe(2)
    expect(results[0].success).toBe(true)
    expect(results[1].success).toBe(true)
    expect(results[0].itemIDs).toEqual([toV2Id(dataset.items[6].__id__)])
    expect(results[1].itemIDs).toEqual([toV2Id(dataset.items[7].__id__), toV2Id(dataset.items[8].__id__)])
  })

  it("attributes new parent cases to the earliest contributing segment", () => {
    const { dataset, c1, c2 } = setupTestDataset()
    const c1CaseIdsBefore = new Set(c1.caseIds)
    const c2CaseIdsBefore = new Set(c2.caseIds)
    // both segments share the NEW parent value a1="c"; segment 0 should own the new parent case
    const segments: DIItemValues[][] = [
      [{ a1: "c", a2: "x", a3: 7 }],
      [{ a1: "c", a2: "x", a3: 8 }]
    ]
    const results = createItemsInSegments(dataset, segments) as DISuccessResult[]

    const newC1CaseIds = c1.caseIds.filter(id => !c1CaseIdsBefore.has(id)).map(toV2Id)
    const newC2CaseIds = c2.caseIds.filter(id => !c2CaseIdsBefore.has(id)).map(toV2Id)
    expect(newC1CaseIds.length).toBe(1)
    expect(newC2CaseIds.length).toBe(1)

    // segment 0 reports the new parent and middle cases plus its child case (3 cases)
    expect(results[0].caseIDs).toContain(newC1CaseIds[0])
    expect(results[0].caseIDs).toContain(newC2CaseIds[0])
    expect(results[0].caseIDs?.length).toBe(3)
    // segment 1 joins the existing new cases, reporting only its own child case
    expect(results[1].caseIDs).not.toContain(newC1CaseIds[0])
    expect(results[1].caseIDs).not.toContain(newC2CaseIds[0])
    expect(results[1].caseIDs?.length).toBe(1)
  })

  it("returns per-segment results equivalent to sequential creates", () => {
    const { dataset: seqData } = setupTestDataset()
    const { dataset: batchData } = setupTestDataset()
    const seg0: DIItemValues[] = [{ a1: "c", a2: "x", a3: 7 }]
    const seg1: DIItemValues[] = [{ a1: "c", a2: "y", a3: 8 }, { a1: "a", a2: "x", a3: 9 }]

    // sequential reference: one handler create per segment
    const seqResults = [
      diItemHandler.create?.({ dataContext: seqData }, seg0) as DISuccessResult,
      diItemHandler.create?.({ dataContext: seqData }, seg1) as DISuccessResult
    ]
    const batchResults = createItemsInSegments(batchData, [seg0, seg1]) as DISuccessResult[]

    batchResults.forEach((result, i) => {
      expect(result.success).toBe(true)
      expect(result.itemIDs?.length).toBe(seqResults[i].itemIDs?.length)
      expect(result.caseIDs?.length).toBe(seqResults[i].caseIDs?.length)
    })
  })

  it("suppresses animation for coalesced (multi-segment) batches only", () => {
    const { dataset } = setupTestDataset()
    const addCasesOptions: Array<IAddCasesOptions | undefined> = []
    const disposer = onAnyAction(dataset, action => {
      if (isAddCasesAction(action)) addCasesOptions.push(action.args[1])
    })

    // a single segment — even with multiple items — animates as an ordinary add
    createItemsInSegments(dataset, [[{ a1: "a", a3: 7 }, { a1: "b", a3: 8 }]])
    expect(addCasesOptions[0]?.suppressAnimation).toBeFalsy()

    // a coalesced run (multiple segments) is a high-speed stream: suppress animation
    createItemsInSegments(dataset, [[{ a1: "a", a3: 9 }], [{ a1: "b", a3: 10 }]])
    expect(addCasesOptions[1]?.suppressAnimation).toBe(true)

    disposer()
  })

  it("treats a non-wrapper `values` property as item data without crashing", () => {
    const { dataset, a1 } = setupTestDataset()
    // Neither of these is the Collaborative `{ values: {...} }` wrapper: `values: null` would
    // previously hit `typeof null === "object"` and crash on the `__id__` access below it;
    // `values: [...]` would be misread as the wrapper. The item itself should be used in both.
    const segments: DIItemValues[][] = [
      [{ a1: "n", a2: "x", a3: 7, values: null } as any],
      [{ a1: "r", a2: "y", a3: 8, values: [1, 2] }]
    ]
    let results: DISuccessResult[] | undefined
    expect(() => { results = createItemsInSegments(dataset, segments) as DISuccessResult[] }).not.toThrow()
    expect(results?.[0].success).toBe(true)
    expect(results?.[1].success).toBe(true)
    expect(a1.value(6)).toBe("n")
    expect(a1.value(7)).toBe("r")
  })

  it("honors Collaborative-style values and explicit ids within segments", () => {
    const { dataset, a1 } = setupTestDataset()
    const id = "segTestId1"
    const segments: DIItemValues[][] = [
      [{ id, values: { a1: "g", a2: "t", a3: 10 } }]
    ]
    const results = createItemsInSegments(dataset, segments) as DISuccessResult[]
    expect(results[0].success).toBe(true)
    expect(dataset.items[6].__id__).toBe(id)
    expect(results[0].itemIDs).toEqual([toV2Id(id)])
    expect(a1.value(6)).toBe("g")
  })
})
