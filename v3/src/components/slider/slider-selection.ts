import { IDataSet } from "../../models/data/data-set"
import { selectAndDeselectCases } from "../../models/data/data-set-utils"

// Whether two sets of item ids are the same once the items the dataset hides are left out. A selection slider
// compares visible items only, so the dataset deselecting the items it hides doesn't change the answer.
export function visibleSetsEqual(dataSet: IDataSet, a: Iterable<string>, b: Iterable<string>) {
  const visibleA = new Set<string>()
  for (const id of a) {
    if (!dataSet.isCaseOrItemHidden(id)) visibleA.add(id)
  }
  let visibleBCount = 0
  for (const id of b) {
    if (dataSet.isCaseOrItemHidden(id)) continue
    if (!visibleA.has(id)) return false
    ++visibleBCount
  }
  return visibleBCount === visibleA.size
}

// Selects exactly the given items, changing only those whose selection state differs, so plugins are notified of
// the change rather than of the whole selection.
export function selectExactly(dataSet: IDataSet, itemIds: ReadonlySet<string>) {
  const add: string[] = []
  itemIds.forEach(id => { if (!dataSet.selection.has(id)) add.push(id) })
  const remove: string[] = []
  dataSet.selection.forEach(id => { if (!itemIds.has(id)) remove.push(id) })
  selectAndDeselectCases(add, remove, dataSet)
}
