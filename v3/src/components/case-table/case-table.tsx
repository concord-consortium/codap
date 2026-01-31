import { Portal } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import React, { useCallback, useEffect, useRef } from "react"
import { ICoreNotification } from "../../data-interactive/notification-core-types"
import { CollectionContext, ParentCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { useTileDropOverlay } from "../../hooks/use-drag-drop"
import { useInstanceIdContext } from "../../hooks/use-instance-id-context"
import { useTileSelectionContext } from "../../hooks/use-tile-selection-context"
import { registerCanAutoScrollCallback } from "../../lib/dnd-kit/dnd-can-auto-scroll"
import { logMessageWithReplacement } from "../../lib/log-message"
import { ICollectionModel } from "../../models/data/collection"
import { IDataSet } from "../../models/data/data-set"
import { createCollectionNotification, deleteCollectionNotification } from "../../models/data/data-set-notifications"
import { mstReaction } from "../../utilities/mst-reaction"
import { prf } from "../../utilities/profiler"
import { excludeDragOverlayRegEx } from "../case-tile-common/case-tile-types"
import { FilterFormulaBar } from "../case-tile-common/filter-formula-bar"
import { AttributeHeaderDividerContext } from "../case-tile-common/use-attribute-header-divider-context"
import { AttributeDragOverlay } from "../drag-drop/attribute-drag-overlay"
import { IScrollOptions } from "./case-table-types"
import { CollectionTable } from "./collection-table"
import { useCaseTableModel } from "./use-case-table-model"
import { useSyncScrolling } from "./use-sync-scrolling"

import "./case-table.scss"

export const CaseTable = observer(function CaseTable() {
  const instanceId = useInstanceIdContext() || "case-table"
  // pass in the instance id since the context hasn't been provided yet
  const { setNodeRef } = useTileDropOverlay(instanceId)
  const data = useDataSetContext()
  const tableModel = useCaseTableModel()
  const tileSelection = useTileSelectionContext()
  const contentRef = useRef<HTMLDivElement>(null)
  const lastNewCollectionDrop = useRef<{ newCollectionId: string, beforeCollectionId: string } | undefined>()

  useEffect(() => {
    // disable vertical auto-scroll of table (column headers can't scroll out of view)
    return registerCanAutoScrollCallback((element, direction) => {
      return element !== contentRef.current || (direction?.y === 0)
    })
  }, [])

  useEffect(() => {
    return tileSelection.addFocusIgnoreFn(event => {
      // disable table becoming selected on attribute drag
      return event.target instanceof HTMLElement && event.target.closest(".codap-attribute-button") != null
    })
  }, [tileSelection])

  useEffect(() => {
    const updateScroll = (horizontalScrollOffset?: number) => {
      if (horizontalScrollOffset != null && contentRef.current &&
        contentRef.current.scrollLeft !== horizontalScrollOffset
      ) {
        contentRef.current.scrollLeft = horizontalScrollOffset
      }
    }

    // Initial scroll is delayed to let RDG do its thing. Otherwise, the scrollLeft change
    // is ignored if the scrollable content hasn't been fully rendered.
    // File => Make a Copy seems to require a longer delay.
    setTimeout(() => updateScroll(tableModel?._horizontalScrollOffset), 50)

    // Reaction handles changes to the model, such as via the API
    return tableModel && mstReaction(
      () => tableModel?._horizontalScrollOffset,
      _horizontalScrollOffset => {
        updateScroll(_horizontalScrollOffset)
      },
      { name: "CaseTable.updateHorizontalScroll" },
      tableModel
    )
  }, [tableModel])

  const { handleTableScroll, syncTableScroll } = useSyncScrolling()

  const handleScrollClosestRowIntoView = useCallback(
    function(collectionId: string, rowIndices: number[], options?: IScrollOptions) {
      const collectionTableModel = tableModel?.getCollectionTableModel(collectionId)
      if (collectionTableModel) {
        collectionTableModel.scrollClosestRowIntoView(rowIndices, options)
        syncTableScroll(collectionId)
      }
    }, [syncTableScroll, tableModel])

  const handleScrollRowRangeIntoView = useCallback(
    function(collectionId: string, rowIndices: number[], options?: IScrollOptions) {
      const collectionTableModel = tableModel?.getCollectionTableModel(collectionId)
      if (collectionTableModel) {
        const [firstIndex, lastIndex] = rowIndices.reduce((prev, index) => {
          const [minIndex, maxIndex] = prev
          return [Math.min(minIndex, index), Math.max(maxIndex, index)] as const
        }, [Infinity, -Infinity] as const)
        collectionTableModel.scrollRangeIntoView(firstIndex, lastIndex, options)
        syncTableScroll(collectionId)
      }
    }, [syncTableScroll, tableModel])

  const handleCollectionTableMount = useCallback((collectionId: string) => {
    if (collectionId === lastNewCollectionDrop.current?.newCollectionId) {
      syncTableScroll(lastNewCollectionDrop.current.beforeCollectionId)
    }
  }, [syncTableScroll])

  const handleNewCollectionDrop = useCallback((dataSet: IDataSet, attrId: string, beforeCollectionId: string) => {
    const attr = dataSet.attrFromID(attrId)
    if (attr) {
      let collection: ICollectionModel | undefined

      // Determine if the old collection will become empty and therefore get removed
      const oldCollectionId = dataSet.getCollectionForAttribute(attrId)?.id
      let removedOldCollection = false

      dataSet.applyModelChange(() => {
        collection = dataSet.moveAttributeToNewCollection(attrId, beforeCollectionId)
        if (collection) {
          lastNewCollectionDrop.current = { newCollectionId: collection.id, beforeCollectionId }
        }
        removedOldCollection = !!(oldCollectionId && !dataSet.getCollection(oldCollectionId))
      }, {
        notify: () => {
          const notifications: ICoreNotification[] = []
          if (removedOldCollection) notifications.push(deleteCollectionNotification(dataSet))
          if (collection) notifications.push(createCollectionNotification(collection, dataSet))
          return notifications
        },
        undoStringKey: "DG.Undo.caseTable.createCollection",
        redoStringKey: "DG.Redo.caseTable.createCollection",
        log: logMessageWithReplacement("Create collection: name: %@, attribute: %@",
                {name: collection?.name, attribute: attr.name},  "table")
      })
    }
  }, [])

  return prf.measure("Table.render", () => {
    if (!tableModel || !data) return null

    const collections = data.collections
    const handleHorizontalScroll: React.UIEventHandler<HTMLDivElement> = () => {
      tableModel.setHorizontalScrollOffset(contentRef.current?.scrollLeft ?? 0)
    }

    return (
      <div ref={setNodeRef} className="case-table" data-testid="case-table">
        {data.hasFilterFormula && <FilterFormulaBar />}
        <div className="case-table-content" ref={contentRef} onScroll={handleHorizontalScroll}>
          <AttributeHeaderDividerContext.Provider value={contentRef}>
            {collections.map((collection, i) => {
              const key = collection.id
              const parent = i > 0 ? collections[i - 1] : undefined
              return (
                <ParentCollectionContext.Provider key={key} value={parent?.id}>
                  <CollectionContext.Provider value={collection.id}>
                    <CollectionTable collectionIndex={i} onMount={handleCollectionTableMount}
                      onNewCollectionDrop={handleNewCollectionDrop} onTableScroll={handleTableScroll}
                      onScrollClosestRowIntoView={handleScrollClosestRowIntoView}
                      onScrollRowRangeIntoView={handleScrollRowRangeIntoView} />
                  </CollectionContext.Provider>
                </ParentCollectionContext.Provider>
              )
            })}
          </AttributeHeaderDividerContext.Provider>
          <Portal>
            <AttributeDragOverlay dragIdPrefix={instanceId} dragIdExcludeRegEx={excludeDragOverlayRegEx} />
          </Portal>
        </div>
      </div>
    )
  })
})
