import { DataSet } from "../../models/data/data-set"
import { scrollChildCollectionsToSelectedCases } from "./sync-selection-scroll"

// builds a 3-level hierarchy (a > b > c) from 3x3x3 = 27 items
function createHierarchicalDataSet() {
  const data = DataSet.create()
  data.addAttribute({ id: "aId", name: "a" })
  data.addAttribute({ id: "bId", name: "b" })
  data.addAttribute({ id: "cId", name: "c" })
  for (let a = 1; a <= 3; ++a) {
    for (let b = 1; b <= 3; ++b) {
      for (let c = 1; c <= 3; ++c) {
        data.addCases([{ __id__: `${a}-${b}-${c}`, aId: `${a}`, bId: `${b}`, cId: `${c}` }])
      }
    }
  }
  const topCollection = data.addCollection({ attributes: ["aId"] })
  const midCollection = data.addCollection({ attributes: ["bId"] })
  const leafCollection = data.childCollection
  data.validateCases()
  return { data, topCollection, midCollection, leafCollection }
}

describe("scrollChildCollectionsToSelectedCases", () => {
  it("scrolls each descendant collection to the selected parent's descendant cases", () => {
    const { data, topCollection, midCollection, leafCollection } = createHierarchicalDataSet()
    // select the first top-level case (a=1)
    const topCase = data.getCasesForCollection(topCollection.id)[0]

    const calls: Array<{ collectionId: string, rowIndices: number[], options?: any }> = []
    const onScrollRowRangeIntoView = (collectionId: string, rowIndices: number[], options?: any) =>
      calls.push({ collectionId, rowIndices, options })

    scrollChildCollectionsToSelectedCases(data, topCollection.id, [topCase.__id__], onScrollRowRangeIntoView)

    // scrolls the two descendant collections (mid + leaf), not the selected/top collection itself
    expect(calls.map(c => c.collectionId)).toEqual([midCollection.id, leafCollection.id])
    // a=1 has 3 b-children at mid-collection rows 0,1,2
    expect(calls[0].rowIndices).toEqual([0, 1, 2])
    // a=1 has 9 c-grandchildren at leaf-collection rows 0..8
    expect(calls[1].rowIndices).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
    // disables scroll sync to avoid feedback loops; the scroll model chooses smooth vs instant by
    // distance, so the helper no longer forces a scroll behavior
    expect(calls[0].options).toEqual({ disableScrollSync: true })
    expect(calls[1].options).toEqual({ disableScrollSync: true })
  })

  it("scrolls to the descendants of a non-first parent (mid-data selection)", () => {
    const { data, topCollection, midCollection, leafCollection } = createHierarchicalDataSet()
    // select the third top-level case (a=3)
    const topCase = data.getCasesForCollection(topCollection.id)[2]

    const calls: Array<{ collectionId: string, rowIndices: number[], options?: any }> = []
    const onScrollRowRangeIntoView = (collectionId: string, rowIndices: number[], options?: any) =>
      calls.push({ collectionId, rowIndices, options })

    scrollChildCollectionsToSelectedCases(data, topCollection.id, [topCase.__id__], onScrollRowRangeIntoView)

    expect(calls.map(c => c.collectionId)).toEqual([midCollection.id, leafCollection.id])
    // a=3 has 3 b-children at mid-collection rows 6,7,8
    expect(calls[0].rowIndices).toEqual([6, 7, 8])
    // a=3 has 9 c-grandchildren at leaf-collection rows 18..26
    expect(calls[1].rowIndices).toEqual([18, 19, 20, 21, 22, 23, 24, 25, 26])
  })

  it("does nothing when the selected case has no descendants (leaf collection)", () => {
    const { data, leafCollection } = createHierarchicalDataSet()
    const leafCase = data.getCasesForCollection(leafCollection.id)[0]

    const calls: string[] = []
    scrollChildCollectionsToSelectedCases(data, leafCollection.id, [leafCase.__id__],
      collectionId => calls.push(collectionId))

    expect(calls).toEqual([])
  })
})
