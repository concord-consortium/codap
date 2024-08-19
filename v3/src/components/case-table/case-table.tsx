import { useDndContext } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import React, { useCallback, useEffect, useRef } from "react"
import { AttributeDragOverlay } from "../drag-drop/attribute-drag-overlay"
import { kIndexColumnKey } from "./case-table-types"
import { CollectionTable } from "./collection-table"
import { useCaseTableModel } from "./use-case-table-model"
import { useSyncScrolling } from "./use-sync-scrolling"
import { CollectionContext, ParentCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { useInstanceIdContext } from "../../hooks/use-instance-id-context"
import { registerCanAutoScrollCallback } from "../../lib/dnd-kit/dnd-can-auto-scroll"
import { ICollectionModel } from "../../models/data/collection"
import { IDataSet } from "../../models/data/data-set"
import { createCollectionNotification, deleteCollectionNotification } from "../../models/data/data-set-notifications"
import { INotification } from "../../models/history/apply-model-change"
import { mstReaction } from "../../utilities/mst-reaction"
import { prf } from "../../utilities/profiler"
import { t } from "../../utilities/translation/translate"

import "./case-table.scss"

interface IProps {
  setNodeRef: (element: HTMLElement | null) => void
}
export const CaseTable = observer(function CaseTable({ setNodeRef }: IProps) {
  const { active } = useDndContext()
  const instanceId = useInstanceIdContext() || "case-table"
  const data = useDataSetContext()
  const tableModel = useCaseTableModel()
  const contentRef = useRef<HTMLDivElement>(null)
  const lastNewCollectionDrop = useRef<{ newCollectionId: string, beforeCollectionId: string } | undefined>()

  useEffect(() => {
    // disable vertical auto-scroll of table (column headers can't scroll out of view)
    return registerCanAutoScrollCallback((element, direction) => {
      return element !== contentRef.current || (direction && direction.y === 0)
    })
  }, [])

  useEffect(() => {
    const updateScroll = (horizontalScrollOffset?: number) => {
      if (horizontalScrollOffset != null && contentRef.current &&
        contentRef.current.scrollLeft !== horizontalScrollOffset
      ) {
        contentRef.current.scrollLeft = horizontalScrollOffset
      }
    }

    // Initial scroll is delayed a frame to let RDG do its thing
    setTimeout(() => updateScroll(tableModel?._horizontalScrollOffset))

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

  const handleScrollClosestRowIntoView = useCallback((collectionId: string, rowIndices: number[]) => {
    const collectionTableModel = tableModel?.getCollectionTableModel(collectionId)
    if (collectionTableModel) {
      collectionTableModel.scrollClosestRowIntoView(rowIndices)
      syncTableScroll(collectionId)
    }
  }, [syncTableScroll, tableModel])

  const handleCollectionTableMount = useCallback((collectionId: string) => {
    if (collectionId === lastNewCollectionDrop.current?.newCollectionId) {
      syncTableScroll(lastNewCollectionDrop.current.beforeCollectionId)
    }
  }, [syncTableScroll])

  const handleNewCollectionDrop = useCallback((dataSet: IDataSet, attrId: string, beforeCollectionId: string) => {
    if (dataSet.attrFromID(attrId)) {
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
          const notifications: INotification[] = []
          if (removedOldCollection) notifications.push(deleteCollectionNotification(dataSet))
          if (collection) notifications.push(createCollectionNotification(collection, dataSet))
          return notifications
        },
        undoStringKey: "DG.Undo.caseTable.createCollection",
        redoStringKey: "DG.Redo.caseTable.createCollection"
      })
    }
  }, [])

  return prf.measure("Table.render", () => {
    // disable the overlay for the index column
    const overlayDragId = active && `${active.id}`.startsWith(instanceId) && !(`${active.id}`.endsWith(kIndexColumnKey))
                            ? `${active.id}` : undefined

    if (!tableModel || !data) return null

    const collections = data.collections
    const handleHorizontalScroll: React.UIEventHandler<HTMLDivElement> = () => {
      tableModel.setHorizontalScrollOffset(contentRef.current?.scrollLeft ?? 0)
    }

    return (
      <div ref={setNodeRef} className="case-table" data-testid="case-table">
        <div className="case-table-content" ref={contentRef} onScroll={handleHorizontalScroll}>
          {collections.map((collection, i) => {
            const key = collection.id
            const parent = i > 0 ? collections[i - 1] : undefined
            return (
              <ParentCollectionContext.Provider key={key} value={parent?.id}>
                <CollectionContext.Provider value={collection.id}>
                  <CollectionTable onMount={handleCollectionTableMount}
                    onNewCollectionDrop={handleNewCollectionDrop} onTableScroll={handleTableScroll}
                    onScrollClosestRowIntoView={handleScrollClosestRowIntoView} />
                </CollectionContext.Provider>
              </ParentCollectionContext.Provider>
            )
          })}
          <AttributeDragOverlay activeDragId={overlayDragId} />
          <NoCasesMessage />
        </div>
      </div>
    )
  })
})

// temporary until we have an input row
const NoCasesMessage = observer(function NoCasesMessage() {
  const data = useDataSetContext()
  return !data?.items.length
          ? <div className="no-cases-message">{t("V3.caseTable.noCases")}</div>
          : null
})
