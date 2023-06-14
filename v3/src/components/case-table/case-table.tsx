import { useDndContext } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import React, { CSSProperties, useEffect, useRef } from "react"
import { AttributeDragOverlay } from "./attribute-drag-overlay"
import { kChildMostTableCollectionId, kIndexColumnKey } from "./case-table-types"
import { CollectionTable } from "./collection-table"
import { useCaseTableModel } from "./use-case-table-model"
import { CollectionContext, ParentCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { useInstanceIdContext } from "../../hooks/use-instance-id-context"
import { useTileModelContext } from "../../hooks/use-tile-model-context"
import { ICollectionPropsModel } from "../../models/data/collection"
import { ITileModel } from "../../models/tiles/tile-model"
import { prf } from "../../utilities/profiler"
import t from "../../utilities/translation/translate"

import "./case-table.scss"

interface IProps {
  tile?: ITileModel
  setNodeRef: (element: HTMLElement | null) => void
}
export const CaseTable = observer(function CaseTable({ tile, setNodeRef }: IProps) {
  const { active } = useDndContext()
  const instanceId = useInstanceIdContext() || "case-table"
  const data = useDataSetContext()
  const tableModel = useCaseTableModel()
  const { isTileSelected } = useTileModelContext()
  const isFocused = isTileSelected()
  const contentRef = useRef<HTMLDivElement | null>(null)

  function setTableRef(elt: HTMLDivElement | null) {
    contentRef.current = elt?.querySelector((".case-table-content")) ?? null
    setNodeRef(elt)
  }

  useEffect(function syncScrollTop() {
    // There is a bug, seemingly in React, in which the scrollLeft property gets reset
    // to 0 when the order of tiles is changed (which happens on selecting/focusing tiles
    // in the free tile layout), even though the CaseTable component is not re-rendered
    // or unmounted/mounted. Therefore, we reset the scrollLeft property from our saved
    // cache on focus change.
    if (isFocused && contentRef.current) {
      contentRef.current.scrollLeft = tableModel?.scrollLeft ?? 0
    }
  }, [isFocused, tableModel])

  return prf.measure("Table.render", () => {
    // disable the overlay for the index column
    const overlayDragId = active && `${active.id}`.startsWith(instanceId) && !(`${active.id}`.endsWith(kIndexColumnKey))
                            ? `${active.id}` : undefined

    if (!tableModel || !data) return null

    const collections: ICollectionPropsModel[] = data.collections.map(collection => collection)
    // add the ungrouped "collection"
    collections.push(data.ungrouped)

    const handleHorizontalScroll: React.UIEventHandler<HTMLDivElement> = () => {
      tableModel?.setScrollLeft(contentRef.current?.scrollLeft ?? 0)
    }

    return (
      <>
        <div ref={setTableRef} className="case-table" data-testid="case-table">
          <div className="case-table-content" onScroll={handleHorizontalScroll}>
            {collections.map((collection, i) => {
              const key = collection?.id || kChildMostTableCollectionId
              const parent = i > 0 ? collections[i - 1] : undefined
              return (
                <ParentCollectionContext.Provider key={key} value={parent}>
                  <CollectionContext.Provider key={key} value={collection}>
                    <CollectionTable />
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
