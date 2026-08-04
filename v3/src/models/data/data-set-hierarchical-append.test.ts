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

describe("DataSet hierarchical append", () => {
  it("doesn't read values for existing items when appending a new sample", () => {
    const data = makeSamplerDataSet()
    for (let sample = 0; sample < 5; ++sample) addSample(data, sample)

    const readItemIds = trackValueReads(data)
    addSample(data, 5)

    expect([...new Set(readItemIds)].sort()).toEqual(["e1-s5-i0", "e1-s5-i1", "e1-s5-i2"])
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
