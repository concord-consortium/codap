import { useCallback } from "react"
import { OnTableScrollFn } from "./case-table-types"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { useCaseTableModel } from "./use-case-table-model"

export function useSyncScrolling() {
  const data = useDataSetContext()
  const tableModel = useCaseTableModel()

  /**
   * The main job of this function is to manage propagation of scroll to the
   * left and to the right to maintain the rule that all parent cases of
   * a visible case should also be visible. We have gotten here from a
   * notification from a scroll event from RDG and any scrolling
   * of dependent tables will also produce scroll events, so we need to
   * avoid getting into feedback loops. We do this by keeping a global scrollCount
   * count and, in each case table, a scroll event count. We increment the
   * global scrollCount and the event count for any case table that wasn't
   * scrolled from propagation. When a new notification arrives if its
   * table has a count less than the propagation count then it was a scroll
   * event from propagation and bypasses further propagation. If it has an event
   * count higher, it is a new event, so propagation should occur.
   */
  const handleTableScroll = useCallback<OnTableScrollFn>((event, collectionId, element) => {
    const collectionTableModel = tableModel?.getCollectionTableModel(collectionId)
    if (!tableModel || !collectionTableModel) return

    // if this is a response echo, then ignore it
    if (tableModel.syncTrailingCollectionScrollCount(collectionId)) return

    /*
     * handle this as a direct user scroll, which should trigger synchronization
     */

    // increment scroll count globally and for triggered table
    tableModel.incScrollCount(collectionId)

    // identify collections to be synchronized
    const { collectionIds = [] } = data || {}
    const triggerCollectionIndex = collectionIds.findIndex(id => id === collectionId)

    // synchronize parent tables in succession
    for (let i = triggerCollectionIndex - 1; i >= 0; --i) {
      // const parentCollectionId = collectionIds[i]
      // const childCollectionId = collectionIds[i + 1]
      // if (!scrollParentToAlignWithChild(parentCollectionId, childCollectionId)) {
      //   // if we didn't scroll, sync the count here
      //   // if we did scroll, count will be synchronized in syncTrailingCollectionScrollCount
      //   tableModel.syncCollectionScrollCount(parentCollectionId)
      // }
    }

    // synchronize child tables in succession
    for (let i = triggerCollectionIndex + 1; i < collectionIds.length; ++i) {
      // const childCollectionId = collectionIds[i]
      // const parentCollectionId = collectionIds[i - 1]
      // if (!scrollChildToAlignWithParent(parentCollectionId, childCollectionId)) {
      //   // if we didn't scroll, sync the count here
      //   // if we did scroll, count will be synchronized in syncTrailingCollectionScrollCount
      //   tableModel.syncCollectionScrollCount(childCollectionId)
      // }
    }
  }, [data, tableModel])

  return { handleTableScroll }
}
