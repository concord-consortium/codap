import { useDndContext } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import React, { CSSProperties, useState } from "react"
import { AttributeDragOverlay } from "./attribute-drag-overlay"
import { CaseTableInspector } from "./case-table-inspector"
import { kIndexColumnKey } from "./case-table-types"
import { CollectionContext } from "./collection-context"
import { CollectionTable } from "./collection-table"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { useInstanceIdContext } from "../../hooks/use-instance-id-context"
import { ICollectionModel } from "../../models/data/collection"
import { prf } from "../../utilities/profiler"
import t from "../../utilities/translation/translate"

import "./case-table.scss"

interface IProps {
  setNodeRef: (element: HTMLElement | null) => void
}
export const CaseTable = observer(({ setNodeRef }: IProps) => {
  const instanceId = useInstanceIdContext() || "case-table"
  const data = useDataSetContext()
  const [showInspector, setShowInspector] = useState(false)
  return prf.measure("Table.render", () => {

    const { active } = useDndContext()
    // disable the overlay for the index column
    const overlayDragId = active && `${active.id}`.startsWith(instanceId) && !(`${active.id}`.endsWith(kIndexColumnKey))
                            ? `${active.id}` : undefined

    if (!data) return null

    const collections: Array<ICollectionModel | undefined> = data.collections.map(collection => collection)
    // add an `undefined` entry which represents the "collection" of ungrouped attributes
    collections.push(undefined)

    return (
      <>
        <div ref={setNodeRef} className="case-table" data-testid="case-table"
            onClick={()=>setShowInspector(!showInspector)}>
              <div className="case-table-content">
                {collections.map(collection => {
                  return (
                    <CollectionContext.Provider key={collection?.id || "child-cases"} value={collection}>
                      <CollectionTable />
                    </CollectionContext.Provider>
                  )
                })}
                <AttributeDragOverlay activeDragId={overlayDragId} />
              </div>
        </div>
        <NoCasesMessage />
        <CaseTableInspector show={showInspector} />
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
