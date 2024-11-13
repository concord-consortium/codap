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
   * avoid getting into feedback loops.
   */
  const syncTableScroll = useCallback((collectionId: string) => {
    const collectionTableModel = tableModel?.getCollectionTableModel(collectionId)
    if (!tableModel || !collectionTableModel) return

    // identify collections to be synchronized
    const { collectionIds = [] } = data || {}
    const triggerCollectionIndex = collectionIds.findIndex(id => id === collectionId)

    // synchronize parent tables in succession
    for (let i = triggerCollectionIndex - 1; i >= 0; --i) {
      const parentCollectionId = collectionIds[i]
      const parentTableModel = tableModel.getCollectionTableModel(parentCollectionId)
      const childTableModel = tableModel.getCollectionTableModel(collectionIds[i + 1])
      if (parentTableModel && childTableModel) {
        parentTableModel.scrollToAlignWithChild(childTableModel)
      }
    }

    // synchronize child tables in succession
    for (let i = triggerCollectionIndex + 1; i < collectionIds.length; ++i) {
      const childCollectionId = collectionIds[i]
      const childTableModel = tableModel.getCollectionTableModel(childCollectionId)
      const parentTableModel = tableModel.getCollectionTableModel(collectionIds[i - 1])
      if (childTableModel && parentTableModel) {
        childTableModel.scrollToAlignWithParent(parentTableModel)
      }
    }
  }, [data, tableModel])

  const handleTableScroll = useCallback<OnTableScrollFn>((event, collectionId, element) => {
    const collectionTableModel = tableModel?.getCollectionTableModel(collectionId)
    if (!tableModel || !collectionTableModel) return

    // if this is a response echo, then ignore it
    if (!collectionTableModel.shouldHandleScrollEvent()) {
      return
    }

    /*
     * handle this as a direct user scroll, which should trigger synchronization
     */
    collectionTableModel.setTargetScrollTop(collectionTableModel.scrollTop)

    syncTableScroll(collectionId)
  }, [syncTableScroll, tableModel])

  return { handleTableScroll, syncTableScroll }
}
