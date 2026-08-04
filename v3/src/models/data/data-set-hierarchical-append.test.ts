import { DataSet, IDataSet } from "./data-set"
import { symIndex, symParent } from "./data-set-types"

// A Sampler-shaped dataset: experiment -> sample -> item.
function makeSamplerDataSet() {
  const data = DataSet.create()
  data.addAttribute({ id: "expId", name: "experiment" })
  data.addAttribute({ id: "sampId", name: "sample" })
  data.addAttribute({ id: "outId", name: "output" })
  data.addCollection({ attributes: ["expId"] })
  data.addCollection({ attributes: ["sampId"] })
  return data
}

function addSample(data: IDataSet, sample: number, { experiment = "1", size = 3 } = {}) {
  data.addCases(Array.from({ length: size }, (_, i) => ({
    __id__: `e${experiment}-s${sample}-i${i}`, expId: experiment, sampId: `${sample}`, outId: `${i}`
  })))
  data.validateCases()
}

// Records which items had their values read. Regrouping a collection reads the values of
// every item it touches, so this reports how much of the dataset a given operation walked.
function trackValueReads(data: IDataSet) {
  const readItemIds: string[] = []
  const { getValue } = data.itemData
  data.itemData.getValue = (itemId: string, attrId: string) => {
    readItemIds.push(itemId)
    return getValue(itemId, attrId)
  }
  return readItemIds
}

// Records the keys written to a map, so a test can report how much of it an operation
// rewrote rather than just whether the end state is right.
function trackWrites<V>(map: Map<string, V>) {
  const record = { sets: [] as string[], clears: 0 }
  const set = map.set.bind(map)
  const clear = map.clear.bind(map)
  map.set = (key: string, value: V) => {
    record.sets.push(key)
    return set(key, value)
  }
  map.clear = () => {
    ++record.clears
    clear()
  }
  return record
}

describe("DataSet hierarchical append", () => {
  it("doesn't read values for existing items when appending a new sample", () => {
    const data = makeSamplerDataSet()
    for (let sample = 0; sample < 5; ++sample) addSample(data, sample)

    const readItemIds = trackValueReads(data)
    addSample(data, 5)

    expect([...new Set(readItemIds)].sort()).toEqual(["e1-s5-i0", "e1-s5-i1", "e1-s5-i2"])
  })

  it("registers only the new cases in the case info map when appending", () => {
    const data = makeSamplerDataSet()
    for (let sample = 0; sample < 5; ++sample) addSample(data, sample)

    const writes = trackWrites(data.caseInfoMap)
    addSample(data, 5)

    // one new sample case and three new item cases; the experiment case already exists
    expect(writes.sets.length).toBe(4)
  })

  it("leaves the case lookup maps as a full regroup would after appending", () => {
    const data = makeSamplerDataSet()
    for (let sample = 0; sample < 3; ++sample) addSample(data, sample)
    // a second experiment, so the maps span more than one branch of the hierarchy
    addSample(data, 0, { experiment: "2" })

    const appended = lookupMapsOf(data)
    data.invalidateCases()
    data.validateCases()

    expect(appended).toEqual(lookupMapsOf(data))
  })

  it("maps only the new items to their child cases when appending", () => {
    const data = makeSamplerDataSet()
    for (let sample = 0; sample < 5; ++sample) addSample(data, sample)

    const writes = trackWrites(data.itemIdChildCaseMap)
    addSample(data, 5)

    expect(writes.clears).toBe(0)
    expect(writes.sets).toEqual(["e1-s5-i0", "e1-s5-i1", "e1-s5-i2"])
  })

  // Everything about a collection that case grouping is responsible for producing. A full
  // regroup from scratch is the ground truth for all of it, so comparing this before and
  // after one is how these tests check that an incremental append got the same answer.
  function groupingOf(data: IDataSet) {
    return data.collections.map(collection => ({
      id: collection.id,
      caseIds: [...collection.caseIds],
      indices: collection.caseGroups.map(group => group.groupedCase[symIndex]),
      parents: collection.caseGroups.map(group => group.groupedCase[symParent]),
      caseIdToIndex: [...collection.caseIdToIndexMap.entries()],
      nonEmptyCaseIds: collection.nonEmptyCases.map(aCase => aCase.__id__)
    }))
  }

  // The dataset-level lookup maps every selection, notification and plugin request goes
  // through. Compared by content rather than by identity, since a regroup builds fresh
  // CaseInfo objects for the same cases.
  function lookupMapsOf(data: IDataSet) {
    return {
      caseInfo: [...data.caseInfoMap.entries()]
        .map(([caseId, info]) => `${caseId} -> ${info.collectionId}/${info.groupedCase.__id__}`).sort(),
      itemIdChildCase: [...data.itemIdChildCaseMap.entries()]
        .map(([itemId, info]) => `${itemId} -> ${info.groupedCase.__id__}`).sort()
    }
  }

  function regroupFromScratch(data: IDataSet) {
    data.invalidateCases()
    data.validateCases()
    return groupingOf(data)
  }

  it("indexes appended cases within their parent, not across the collection", () => {
    const data = makeSamplerDataSet()
    addSample(data, 0)
    addSample(data, 1)
    addSample(data, 2)

    // each sample's items are indexed 0..2 within that sample, not 0..8 across the collection
    expect(data.childCollection.caseGroups.map(group => group.groupedCase[symIndex]))
      .toEqual([0, 1, 2, 0, 1, 2, 0, 1, 2])

    const appended = groupingOf(data)
    expect(appended).toEqual(regroupFromScratch(data))
  })

  it("excludes an appended case with no values from nonEmptyCases", () => {
    const data = makeSamplerDataSet()
    addSample(data, 0)

    // no value for the childmost collection's attribute, so this forms an empty case
    data.addCases([{ __id__: "e1-s1-empty", expId: "1", sampId: "1", outId: "" }])
    data.validateCases()

    expect(data.childCollection.cases.length).toBe(4)
    expect(data.childCollection.nonEmptyCases.length).toBe(3)

    const appended = groupingOf(data)
    expect(appended).toEqual(regroupFromScratch(data))
  })

  it("excludes an appended case that is hidden", () => {
    const data = makeSamplerDataSet()
    addSample(data, 0)

    // Setting an item aside and then removing it leaves its id set aside, so an item later
    // re-added under that id is already hidden by the time its case group is created.
    data.hideCasesOrItems(["e1-s0-i0"])
    data.validateCases()
    data.removeCases(["e1-s0-i0"])
    data.validateCases()

    data.addCases([
      { __id__: "e1-s0-i0", expId: "1", sampId: "1", outId: "0" },
      { __id__: "e1-s1-i1", expId: "1", sampId: "1", outId: "1" }
    ])
    data.validateCases()

    expect(data.isItemHidden("e1-s0-i0")).toBe(true)
    expect(data.childCollection.caseIds).not.toContain(
      data.getItemChildCaseId("e1-s0-i0")
    )

    const appended = groupingOf(data)
    expect(appended).toEqual(regroupFromScratch(data))
  })

  // One request that adds items for two samples at once -- the shape the Sampler produces
  // when a batch is coalesced -- is the only way the childmost collection sees new cases
  // under more than one parent in a single pass, which is what the per-parent index
  // arithmetic exists for.
  it("indexes appended cases per parent when one batch spans two parents", () => {
    const data = makeSamplerDataSet()
    addSample(data, 0)

    data.addCases([
      { __id__: "e1-s1-i0", expId: "1", sampId: "1", outId: "0" },
      { __id__: "e1-s1-i1", expId: "1", sampId: "1", outId: "1" },
      { __id__: "e1-s2-i0", expId: "1", sampId: "2", outId: "0" },
      { __id__: "e1-s2-i1", expId: "1", sampId: "2", outId: "1" }
    ])
    data.validateCases()

    // sample 0 has three items, samples 1 and 2 have two each; each is indexed from 0
    expect(data.childCollection.caseGroups.map(group => group.groupedCase[symIndex]))
      .toEqual([0, 1, 2, 0, 1, 0, 1])

    const appended = groupingOf(data)
    expect(appended).toEqual(regroupFromScratch(data))
  })

  // Appending an item to a case whose items were all hidden makes that case visible again.
  // The case already exists, so it isn't among the new cases the additive path is told about,
  // and its parent has never been told about it either -- it was hidden when the parent last
  // collected its children. Both collections have to end up as a full regroup would.
  it("restores a case that an appended item un-hides, in a middle collection", () => {
    const data = DataSet.create()
    data.addAttribute({ id: "gId", name: "g" })
    data.addAttribute({ id: "mId", name: "m" })
    data.addAttribute({ id: "outId", name: "out" })
    data.addCollection({ attributes: ["gId"] })
    data.addCollection({ attributes: ["mId"] })

    data.addCases([
      { __id__: "i1", gId: "1", mId: "1", outId: "a" },
      { __id__: "i2", gId: "1", mId: "2", outId: "b" }
    ])
    data.validateCases()
    data.hideCasesOrItems(["i2"])
    data.validateCases()

    // i3 un-hides the m=2 case; i4 creates a new m=3 case
    data.addCases([
      { __id__: "i3", gId: "1", mId: "2", outId: "c" },
      { __id__: "i4", gId: "1", mId: "3", outId: "d" }
    ])
    data.validateCases()

    const middle = data.collections[1]
    expect(middle.cases.length).toBe(middle.caseIds.length)

    const appended = groupingOf(data)
    expect(appended).toEqual(regroupFromScratch(data))
  })

  it("restores a case that an appended item un-hides, in a top-level collection", () => {
    const data = DataSet.create()
    data.addAttribute({ id: "expId", name: "experiment" })
    data.addAttribute({ id: "outId", name: "output" })
    data.addCollection({ attributes: ["expId"] })

    data.addCases([
      { __id__: "i1", expId: "1", outId: "a" },
      { __id__: "i2", expId: "2", outId: "b" }
    ])
    data.validateCases()
    data.hideCasesOrItems(["i2"])
    data.validateCases()

    data.addCases([
      { __id__: "i3", expId: "2", outId: "c" },
      { __id__: "i4", expId: "3", outId: "d" }
    ])
    data.validateCases()

    const parent = data.collections[0]
    expect(parent.cases.length).toBe(parent.caseIds.length)

    const appended = groupingOf(data)
    expect(appended).toEqual(regroupFromScratch(data))
  })

  it("orders appended cases correctly when they join an existing, earlier parent", () => {
    const data = makeSamplerDataSet()
    addSample(data, 0, { experiment: "1" })
    addSample(data, 0, { experiment: "2" })

    // a new sample under experiment 1, which is no longer the last experiment
    addSample(data, 1, { experiment: "1" })

    const appended = groupingOf(data)
    expect(appended).toEqual(regroupFromScratch(data))
  })
})
