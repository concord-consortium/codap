import { IDataSet } from "../../models/data/data-set"
import { selectAndDeselectCases } from "../../models/data/data-set-utils"

// Whether two sets of item ids are the same once the items the dataset hides, or no longer has, are left out. A
// selection slider compares visible items only, so the dataset deselecting the items it hides or deletes doesn't
// change the answer.
export function visibleSetsEqual(dataSet: IDataSet, a: Iterable<string>, b: Iterable<string>) {
  const isVisible = (id: string) => dataSet.hasItem(id) && !dataSet.isCaseOrItemHidden(id)
  const visibleA = new Set<string>()
  for (const id of a) {
    if (isVisible(id)) visibleA.add(id)
  }
  let visibleBCount = 0
  for (const id of b) {
    if (!isVisible(id)) continue
    if (!visibleA.has(id)) return false
    ++visibleBCount
  }
  return visibleBCount === visibleA.size
}

// Selects exactly the given items, changing only those whose selection state differs, so plugins are notified of
// the change rather than of the whole selection. Plugins are told about cases, so each item is passed as its
// childmost case, as the marquee does. A hidden item's case doesn't contain it, so a hidden item is passed as itself:
// it's deselected but not reported.
export function selectExactly(dataSet: IDataSet, itemIds: ReadonlySet<string>) {
  dataSet.validateCases()
  const toCaseId = (itemId: string) => {
    const caseId = dataSet.getItemChildCaseId(itemId)
    return caseId && dataSet.caseInfoMap.get(caseId)?.childItemIds.includes(itemId) ? caseId : itemId
  }
  const add: string[] = []
  itemIds.forEach(id => { if (!dataSet.selection.has(id)) add.push(toCaseId(id)) })
  const remove: string[] = []
  dataSet.selection.forEach(id => { if (!itemIds.has(id)) remove.push(toCaseId(id)) })
  selectAndDeselectCases(add, remove, dataSet)
}
