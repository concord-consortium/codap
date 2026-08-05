import { isAddCasesAction } from "../../models/data/data-set-actions"
import { IAddCasesOptions } from "../../models/data/data-set-types"
import { IDataSet } from "../../models/data/data-set"
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
  // Ground truth, independent of how the handler works it out: a case belongs to a request
  // exactly when every item in it came from that request. Deriving the expectation from the
  // dataset's own caseIds would share whatever staleness the implementation has.
  function casesCreatedBy(dataset: IDataSet, itemIds: string[]) {
    dataset.validateCases()
    const added = new Set(itemIds)
    const created: string[] = []
    dataset.caseInfoMap.forEach((caseInfo, caseId) => {
      const items = [...caseInfo.childItemIds, ...caseInfo.hiddenChildItemIds]
      if (items.length === 0 || !items.every(itemId => added.has(itemId))) return
      // a case with no visible items has no index and is deliberately not reported
      if (caseInfo.childItemIds.length === 0) return
      created.push(caseId)
    })
    return created
  }

  it("reports every case created after the group's items were deleted", () => {
    const { dataset } = setupTestDataset()
    // a plugin deletes a whole group, then re-creates it; deleting doesn't revalidate
    dataset.items.filter((_, index) => index % 2 === 1)
      .forEach(item => diItemHandler.delete?.({ dataContext: dataset, item }))
    expect(dataset.isValidCases).toBe(false)   // the path under test

    const results = createItemsInSegments(dataset, [[
      { a1: "b", a2: "y", a3: 100 }
    ]]) as DISuccessResult[]

    const newItemId = dataset.items[dataset.items.length - 1].__id__
    const created = casesCreatedBy(dataset, [newItemId])
    expect(created.length).toBe(3)
    expect(results[0].caseIDs).toHaveLength(created.length)
    created.forEach(caseId => expect(results[0].caseIDs).toContain(toV2Id(caseId)))
  })

  it("doesn't report a surviving parent case when an append joins it", () => {
    const { dataset } = setupTestDataset()
    // delete one item of the a1="b" group, leaving that parent case alive, and don't
    // revalidate -- so the append below runs the same newly-taken path as the tests around it
    diItemHandler.delete?.({ dataContext: dataset, item: dataset.items[1] })
    expect(dataset.isValidCases).toBe(false)

    const results = createItemsInSegments(dataset, [[
      { a1: "b", a2: "y", a3: 100 }
    ]]) as DISuccessResult[]

    const newItemId = dataset.items[dataset.items.length - 1].__id__
    const created = casesCreatedBy(dataset, [newItemId])
    // the a1="b" parent and the (b,y) middle case both survive, so only the leaf is new
    expect(created.length).toBe(1)
    expect(results[0].caseIDs).toHaveLength(1)
    created.forEach(caseId => expect(results[0].caseIDs).toContain(toV2Id(caseId)))
  })

  it("reports only the new cases when a snapshot has just replaced the dataset", () => {
    const { dataset, a1 } = setupTestDataset()
    // prepareSnapshot first, as serializing a document does; without it afterApplySnapshot
    // rebuilds the volatile values from an already-cleared frozen array and blanks them all,
    // so the test would run against an empty dataset rather than a restored one
    dataset.prepareSnapshot()
    dataset.afterApplySnapshot()
    dataset.completeSnapshot()
    expect(a1.strValues).toEqual(["a", "b", "a", "b", "a", "b"])
    expect(dataset.isValidCases).toBe(false)

    const results = createItemsInSegments(dataset, [[
      { a1: "zz", a2: "zz", a3: 200 }
    ]]) as DISuccessResult[]

    const newItemId = dataset.items[dataset.items.length - 1].__id__
    const created = casesCreatedBy(dataset, [newItemId])
    expect(created.length).toBe(3)
    expect(results[0].caseIDs).toHaveLength(created.length)
    created.forEach(caseId => expect(results[0].caseIDs).toContain(toV2Id(caseId)))
  })

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

  // The fast path can't always say what it created. When it can't, the answer has to be
  // worked out rather than assumed to be "nothing" — the cases exist either way, and a
  // plugin told otherwise silently diverges from CODAP.
  it("reports created cases when the data context is invalid on arrival", () => {
    const { dataset } = setupTestDataset()
    // deleteItem/deleteCaseBy/itemSearch.delete all removeCases without revalidating, so a
    // plugin that deletes and then creates arrives here with grouping invalid
    dataset.removeCases([dataset.items[0].__id__])
    const before = dataset.collections.map(collection => new Set(collection.caseIds))

    const results = createItemsInSegments(dataset, [[
      { a1: "qq", a2: "qq", a3: 300 }
    ]]) as DISuccessResult[]

    const created = dataset.collections.flatMap((collection, index) =>
      collection.caseIds.filter(caseId => !before[index].has(caseId)))
    expect(created.length).toBeGreaterThan(0)
    created.forEach(caseId => expect(results[0].caseIDs).toContain(toV2Id(caseId)))
    // and nothing beyond them: reporting a case the request didn't produce sends the plugin
    // a createCases notification for a case it already has
    expect(results[0].caseIDs).toHaveLength(created.length)
  })

  it("reports created cases when an appended item un-hides a case", () => {
    const { dataset } = setupTestDataset()
    const bItemIds = dataset.items.filter((_, index) => index % 2 === 1).map(item => item.__id__)
    dataset.hideCasesOrItems(bItemIds)
    dataset.validateCases()
    const before = dataset.collections.map(collection => new Set(collection.caseIds))

    // the first item un-hides the "b" branch; the second forms an unrelated new branch
    const results = createItemsInSegments(dataset, [[
      { a1: "b", a2: "y", a3: 100 },
      { a1: "zz", a2: "zz", a3: 200 }
    ]]) as DISuccessResult[]

    const created = dataset.collections.flatMap((collection, index) =>
      collection.caseIds.filter(caseId => !before[index].has(caseId)))
    expect(created.length).toBeGreaterThan(0)
    created.forEach(caseId => expect(results[0].caseIDs).toContain(toV2Id(caseId)))
    // and nothing beyond them: reporting a case the request didn't produce sends the plugin
    // a createCases notification for a case it already has
    expect(results[0].caseIDs).toHaveLength(created.length)
  })

  // The un-hidden case can turn up in a collection whose ancestors have already been grouped
  // and already gained cases of their own, so recovering what they started from means
  // discounting those.
  it("reports created cases when an un-hidden case follows a new case in an outer collection", () => {
    const { dataset } = setupTestDataset()
    // item 2 is the only (a, z) item, so hiding it hides that middle case while its parent
    // case "a" stays visible through items 0 and 4
    dataset.hideCasesOrItems([dataset.items[2].__id__])
    dataset.validateCases()
    const before = dataset.collections.map(collection => new Set(collection.caseIds))

    const results = createItemsInSegments(dataset, [[
      { a1: "NEW", a2: "n", a3: 1 },   // forms a new case in the outermost collection
      { a1: "a", a2: "z", a3: 9 }      // un-hides the middle case, in a later collection
    ]]) as DISuccessResult[]

    const created = dataset.collections.flatMap((collection, index) =>
      collection.caseIds.filter(caseId => !before[index].has(caseId)))
    expect(created.length).toBeGreaterThan(0)
    created.forEach(caseId => expect(results[0].caseIDs).toContain(toV2Id(caseId)))
    // and nothing beyond them: reporting a case the request didn't produce sends the plugin
    // a createCases notification for a case it already has
    expect(results[0].caseIDs).toHaveLength(created.length)
  })

  it("reports the cases a re-sent item id creates when its grouping values are new", () => {
    const { dataset } = setupTestDataset()
    const existingItemId = dataset.items[0].__id__
    const before = dataset.collections.map(collection => new Set(collection.caseIds))

    // re-sending an id moves that item to a new group, forming cases that really are new
    const results = createItemsInSegments(dataset, [[
      { id: toV2Id(existingItemId), values: { a1: "brandNewA1", a2: "brandNewA2", a3: 42 } }
    ]]) as DISuccessResult[]

    const created = dataset.collections.flatMap((collection, index) =>
      collection.caseIds.filter(caseId => !before[index].has(caseId)))
    expect(created.length).toBeGreaterThan(0)
    created.forEach(caseId => expect(results[0].caseIDs).toContain(toV2Id(caseId)))
    // and nothing beyond them: reporting a case the request didn't produce sends the plugin
    // a createCases notification for a case it already has
    expect(results[0].caseIDs).toHaveLength(created.length)
  })

  it("does not report pre-existing cases when an item id is re-sent", () => {
    const { dataset } = setupTestDataset()
    const existingItemId = dataset.items[0].__id__

    // The Collaborative plugin supplies its own ids; a replayed or duplicated sync message
    // re-sends one CODAP already holds. No case is created, so none should be reported.
    const results = createItemsInSegments(dataset, [[
      { id: toV2Id(existingItemId), values: { a1: "a", a2: "x", a3: 42 } }
    ]]) as DISuccessResult[]

    expect(results[0].caseIDs).toEqual([])
  })

  it("reports each new case for its own collection when an item id repeats in one request", () => {
    const { dataset } = setupTestDataset()
    const c1Before = new Set(dataset.collections[0].caseIds)
    const c2Before = new Set(dataset.collections[1].caseIds)
    const c3Before = new Set(dataset.collections[2].caseIds)

    const results = createItemsInSegments(dataset, [[
      { __id__: "dup", a1: "new", a2: "n1", a3: 1 },
      { __id__: "dup", a1: "new", a2: "n2", a3: 2 }
    ]]) as DISuccessResult[]

    const reported = new Set(results[0].caseIDs ?? [])
    const newIn = (collection: { caseIds: string[] }, before: Set<string>) =>
      collection.caseIds.filter(caseId => !before.has(caseId))

    // every case this request created is reported, in whichever collection it belongs to
    const created = [
      ...newIn(dataset.collections[0], c1Before),
      ...newIn(dataset.collections[1], c2Before),
      ...newIn(dataset.collections[2], c3Before)
    ]
    expect(created.length).toBeGreaterThan(0)
    created.forEach(caseId => expect(reported.has(toV2Id(caseId))).toBe(true))
  })

  it("does not report a new case that is hidden", () => {
    const { dataset } = setupTestDataset()
    const itemId = dataset.items[0].__id__

    // Setting an item aside and then removing it leaves its id set aside, so an item
    // re-created under that id is hidden as soon as its case is formed.
    dataset.hideCasesOrItems([itemId])
    dataset.validateCases()
    dataset.removeCases([itemId])
    dataset.validateCases()

    const results = createItemsInSegments(dataset, [[
      { __id__: itemId, a1: "hidden", a2: "hidden", a3: 99 }
    ]]) as DISuccessResult[]

    expect(dataset.isItemHidden(itemId)).toBe(true)
    expect(results[0].caseIDs).toEqual([])
  })

  it("reports new case ids in collection order rather than the order the items arrived", () => {
    const { dataset, c2 } = setupTestDataset()
    const c2Before = new Set(c2.caseIds)

    // The first item joins the later parent "b" and the second the earlier parent "a", so
    // the case the second item forms precedes the case the first item forms.
    const results = createItemsInSegments(dataset, [[
      { a1: "b", a2: "later", a3: 7 },
      { a1: "a", a2: "earlier", a3: 8 }
    ]]) as DISuccessResult[]

    const newC2CaseIds = c2.caseIds.filter(caseId => !c2Before.has(caseId))
    expect(newC2CaseIds.length).toBe(2)

    const reported = results[0].caseIDs ?? []
    const positions = newC2CaseIds.map(caseId => reported.indexOf(toV2Id(caseId)))
    expect(positions.every(position => position >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })

  it("attributes a shared case to the earliest contributing segment when that is not segment 0", () => {
    const { dataset, c1 } = setupTestDataset()
    const c1Before = new Set(c1.caseIds)
    // seg0 creates parent "p"; seg1 creates parent "q"; seg2 JOINS parent "q" (created by seg1).
    // The shared parent "q" must be attributed to seg1 — the earliest contributor — not seg2.
    const segments: DIItemValues[][] = [
      [{ a1: "p", a2: "m", a3: 1 }],
      [{ a1: "q", a2: "n", a3: 2 }],
      [{ a1: "q", a2: "r", a3: 3 }]
    ]
    const results = createItemsInSegments(dataset, segments) as DISuccessResult[]

    // two new parent cases were created: "p" (seg0) and "q" (seg1, joined by seg2)
    const newC1CaseIds = c1.caseIds.filter(id => !c1Before.has(id)).map(toV2Id)
    expect(newC1CaseIds.length).toBe(2)

    // Counts encode the attribution: seg0 owns parent "p" + middle + leaf (3); seg1 owns parent
    // "q" + middle + leaf (3); seg2 only its own middle + leaf (2). If parent "q" were
    // mis-attributed to seg2, these would read 3 / 2 / 3 instead.
    expect(results[0].caseIDs?.length).toBe(3)
    expect(results[1].caseIDs?.length).toBe(3)
    expect(results[2].caseIDs?.length).toBe(2)

    // each new parent case is reported exactly once across all segments (no double-report, no drop)
    const allReported = [
      ...(results[0].caseIDs ?? []), ...(results[1].caseIDs ?? []), ...(results[2].caseIDs ?? [])
    ]
    newC1CaseIds.forEach(id => expect(allReported.filter(reported => reported === id).length).toBe(1))
  })

  it("does not re-report pre-existing parent cases when new items join them", () => {
    const { dataset, c1, c2 } = setupTestDataset()
    const c1Before = new Set(c1.caseIds)
    const c2Before = new Set(c2.caseIds)

    // segment 0 joins the EXISTING (a1="a", a2="x") parent/middle cases — only its leaf case is
    // new; segment 1 introduces a wholly new (a1="c", a2="q") hierarchy — new parent, middle, leaf
    const segments: DIItemValues[][] = [
      [{ a1: "a", a2: "x", a3: 99 }],
      [{ a1: "c", a2: "q", a3: 100 }]
    ]
    const results = createItemsInSegments(dataset, segments) as DISuccessResult[]

    // segment 0 reports only its own new leaf case (existing parent/middle cases are not re-reported)
    expect(results[0].caseIDs?.length).toBe(1)
    // segment 1 reports its new parent + middle + leaf cases
    expect(results[1].caseIDs?.length).toBe(3)

    // no pre-existing parent/middle case id appears in any segment's reported caseIDs
    const reported = new Set([...(results[0].caseIDs ?? []), ...(results[1].caseIDs ?? [])])
    c1.caseIds.filter(id => c1Before.has(id)).forEach(id => expect(reported.has(toV2Id(id))).toBe(false))
    c2.caseIds.filter(id => c2Before.has(id)).forEach(id => expect(reported.has(toV2Id(id))).toBe(false))
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
