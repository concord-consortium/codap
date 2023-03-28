import { useDndContext } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import React, { CSSProperties } from "react"
import { AttributeDragOverlay } from "./attribute-drag-overlay"
import { CaseTableInspector } from "./case-table-inspector"
import { kChildMostTableCollectionId, kIndexColumnKey } from "./case-table-types"
import { CollectionTable } from "./collection-table"
import { CollectionContext, ParentCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { useInstanceIdContext } from "../../hooks/use-instance-id-context"
import { ICollectionPropsModel } from "../../models/data/collection"
import { ITileModel } from "../../models/tiles/tile-model"
import { uiState } from "../../models/ui-state"
import { prf } from "../../utilities/profiler"
import t from "../../utilities/translation/translate"

import styles from "./case-table.module.scss"

interface IProps {
  tile?: ITileModel
  setNodeRef: (element: HTMLElement | null) => void
}
export const CaseTable = observer(function CaseTable({ tile, setNodeRef }: IProps) {
  const { active } = useDndContext()
  const instanceId = useInstanceIdContext() || "case-table"
  const data = useDataSetContext()
  return prf.measure("Table.render", () => {

    // disable the overlay for the index column
    const overlayDragId = active && `${active.id}`.startsWith(instanceId) && !(`${active.id}`.endsWith(kIndexColumnKey))
                            ? `${active.id}` : undefined

    if (!data) return null

    const collections: ICollectionPropsModel[] = data.collections.map(collection => collection)
    // add the ungrouped "collection"
    collections.push(data.ungrouped)

    return (
      <>
        <div ref={setNodeRef} className={`case-table ${styles['case-table']}`} data-testid="case-table">
          <div className="case-table-content">
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
        <CaseTableInspector show={uiState.isFocusedTile(tile?.id)} />
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
