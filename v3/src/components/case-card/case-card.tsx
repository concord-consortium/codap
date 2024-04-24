import { observer } from "mobx-react-lite"
import React, { CSSProperties } from "react"
import { CollectionContext, ParentCollectionContext } from "../../hooks/use-collection-context"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { useCaseCardModel } from "./use-case-card-model"
import { prf } from "../../utilities/profiler"
import { t } from "../../utilities/translation/translate"

import "./case-card.scss"

interface IProps {
  setNodeRef: (element: HTMLElement | null) => void
}
export const CaseCard = observer(function CaseCard({ setNodeRef }: IProps) {
/*
  const { active } = useDndContext()
  const instanceId = useInstanceIdContext() || "case-card"
*/
  const data = useDataSetContext()
  const cardModel = useCaseCardModel()
  // const { isTileSelected } = useTileModelContext()
  // const isFocused = isTileSelected()
  // const lastNewCollectionDrop = useRef<{ newCollectionId: string, beforeCollectionId: string } | undefined>()

/*
  const handleNewCollectionDrop = useCallback((dataSet: IDataSet, attrId: string, beforeCollectionId: string) => {
    if (dataSet.attrFromID(attrId)) {
      dataSet.applyModelChange(() => {
        const collection = dataSet.moveAttributeToNewCollection(attrId, beforeCollectionId)
        if (collection) {
          lastNewCollectionDrop.current = { newCollectionId: collection.id, beforeCollectionId }
        }
      }, {
        undoStringKey: "DG.Undo.caseTable.createCollection",
        redoStringKey: "DG.Redo.caseTable.createCollection"
      })
    }
  }, [])
*/

  return prf.measure("Table.render", () => {
    // disable the overlay for the index column
/*
    const overlayDragId = active && `${active.id}`.startsWith(instanceId) && !(`${active.id}`.endsWith(kIndexColumnKey))
                            ? `${active.id}` : undefined
*/

    if (!cardModel || !data) return null

    const collections = data.collectionModels
    return (
      <>
        <div ref={setNodeRef} className="case-card" data-testid="case-card">
          <div className="case-card-content">
            {collections.map((collection, i) => {
              const key = collection.id
              const parent = i > 0 ? collections[i - 1] : undefined
              return (
                <ParentCollectionContext.Provider key={key} value={parent?.id}>
                  <CollectionContext.Provider value={collection.id}>
{/*
                    <CollectionCard onMount={handleCollectionCardMount}
                      onNewCollectionDrop={handleNewCollectionDrop} onTableScroll={handleTableScroll}
                      onScrollClosestRowIntoView={handleScrollClosestRowIntoView} />
*/}
                  </CollectionContext.Provider>
                </ParentCollectionContext.Provider>
              )
            })}
            {/*<AttributeDragOverlay activeDragId={overlayDragId} />*/}
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
