import { useDndContext } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import React, { CSSProperties, useCallback, useEffect, useRef } from "react"
import { AttributeDragOverlay } from "../drag-drop/attribute-drag-overlay"
import { kIndexColumnKey } from "./case-table-types"
import { CollectionTable } from "./collection-table"
import { useCaseTableModel } from "./use-case-table-model"
import { useSyncScrolling } from "./use-sync-scrolling"
import { CollectionContext, ParentCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { useInstanceIdContext } from "../../hooks/use-instance-id-context"
import { useTileModelContext } from "../../hooks/use-tile-model-context"
import { IDataSet } from "../../models/data/data-set"
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
  const { isTileSelected } = useTileModelContext()
  const isFocused = isTileSelected()
  const contentRef = useRef<HTMLDivElement | null>(null)
  const lastNewCollectionDrop = useRef<{ newCollectionId: string, beforeCollectionId: string } | undefined>()

  function setTableRef(elt: HTMLDivElement | null) {
    contentRef.current = elt?.querySelector((".case-table-content")) ?? null
    setNodeRef(elt)
  }

  useEffect(function syncScrollLeft() {
    // There is a bug, seemingly in React, in which the scrollLeft property gets reset
    // to 0 when the order of tiles is changed (which happens on selecting/focusing tiles
    // in the free tile layout), even though the CaseTable component is not re-rendered
    // or unmounted/mounted. Therefore, we reset the scrollLeft property from our saved
    // cache on focus change.
    if (isFocused && contentRef.current) {
      contentRef.current.scrollLeft = tableModel?.scrollLeft ?? 0
    }
  }, [isFocused, tableModel])

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
      dataSet.applyUndoableAction(() => {
        const collection = dataSet.moveAttributeToNewCollection(attrId, beforeCollectionId)
        lastNewCollectionDrop.current = { newCollectionId: collection.id, beforeCollectionId }
      }, "DG.Undo.caseTable.createCollection", "DG.Redo.caseTable.createCollection")
    }
  }, [])

  return prf.measure("Table.render", () => {
    // disable the overlay for the index column
    const overlayDragId = active && `${active.id}`.startsWith(instanceId) && !(`${active.id}`.endsWith(kIndexColumnKey))
                            ? `${active.id}` : undefined

    if (!tableModel || !data) return null

    const collections = data.collectionModels
    const handleHorizontalScroll: React.UIEventHandler<HTMLDivElement> = () => {
      tableModel?.setScrollLeft(contentRef.current?.scrollLeft ?? 0)
    }

    return (
      <>
        <div ref={setTableRef} className="case-table" data-testid="case-table">
          <div className="case-table-content" onScroll={handleHorizontalScroll}>
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
          </div>
        </div>
        <NoCasesMessage />
      </>
    )
  })
})

// temporary until we have an input row
export const NoCasesMessage = () => {
  const data = useDataSetContext()
  const style: CSSProperties = {
    position: "absolute",
    top: 54,
    width: "100%",
    textAlign: "center",
    fontSize: 14,
    fontStyle: "italic"
  }
  return !data?.cases.length
          ? <div className="no-cases-message" style={style}>{t("V3.caseTable.noCases")}</div>
          : null
}
