import { IDataSet } from "../../models/data/data-set"
import { collectionCaseIndexFromId } from "../../models/data/data-set-utils"
import { OnScrollRowsIntoViewFn } from "./case-table-types"

/**
 * Scrolls each descendant collection's table to bring the selected parent cases' descendants
 * into view. Starting from the given (selected) cases in `parentCollectionId`, it walks down
 * the collection hierarchy, gathering each level's child cases and scrolling that collection's
 * table to their row range. `disableScrollSync` is passed so these programmatic scrolls don't
 * feed back into the scroll-synchronization logic.
 *
 * This is the cascade that keeps hierarchical selection visible across collections. It is
 * invoked for any selection source (graph, plugin, programmatic, or a table cell click).
 */
export function scrollChildCollectionsToSelectedCases(
  data: IDataSet | undefined,
  parentCollectionId: string,
  selectedCaseIds: string[],
  onScrollRowRangeIntoView: OnScrollRowsIntoViewFn
) {
  const collection = data?.getCollection(parentCollectionId)
  let caseIds = selectedCaseIds
  for (let childCollection = collection?.child; childCollection; childCollection = childCollection?.child) {
    const childCaseIds: string[] = []
    const childIndices: number[] = []
    caseIds.forEach(id => {
      const caseInfo = data?.caseInfoMap.get(id)
      caseInfo?.childCaseIds?.forEach(childCaseId => {
        childCaseIds.push(childCaseId)
        const caseIndex = collectionCaseIndexFromId(childCaseId, data, childCollection.id)
        if (caseIndex != null) {
          childIndices.push(caseIndex)
        }
      })
    })
    // scroll to newly selected child cases (if any). `disableScrollSync` avoids feedback; the
    // scroll model picks the behavior by distance (instant for far selections — avoiding a slow
    // animation across the dataset — smooth for nearby ones), so we don't force it here.
    if (childIndices.length) {
      onScrollRowRangeIntoView(childCollection.id, childIndices, { disableScrollSync: true })
    }
    // advance to child cases in next collection
    caseIds = childCaseIds
  }
}
