import { useMergeRefs } from "@chakra-ui/react"
import { useDndContext } from "@dnd-kit/core"
import { observer } from "mobx-react-lite"
import React, { useCallback, useRef } from "react"
// import { useResizeDetector } from "react-resize-detector"
import { useDataSet } from "../../hooks/use-data-set"
import { getOverlayDragId } from "../../hooks/use-drag-drop"
import { useInstanceIdContext } from "../../hooks/use-instance-id-context"
import { prf } from "../../utilities/profiler"
import { excludeDragOverlayRegEx } from "../case-tile-common/case-tile-types"
// import { DGDataContext } from "../../models/v2/dg-data-context"
import { AttributeDragOverlay } from "../drag-drop/attribute-drag-overlay"
import { CardView } from "./card-view"
import { useCaseCardModel } from "./use-case-card-model"
import { IDataSet } from "../../models/data/data-set"

// import "./case-card.v2"
import "./case-card.scss"

interface IProps {
  setNodeRef: (element: HTMLElement | null) => void
}
export const CaseCard = observer(function CaseCard({ setNodeRef }: IProps) {
  const { active } = useDndContext()
  const instanceId = useInstanceIdContext() || "case-card"
  const {data} = useDataSet()
  const cardModel = useCaseCardModel()
  const containerRef = useRef<HTMLDivElement>(null)
  const mergeRefs = useMergeRefs<HTMLDivElement>(containerRef, setNodeRef)

  // const { width, height } = useResizeDetector({ targetRef: containerRef })

  // const { isTileSelected } = useTileModelContext()
  // const isFocused = isTileSelected()
  const lastNewCollectionDrop = useRef<{ newCollectionId: string, beforeCollectionId: string } | undefined>()

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

  if (!cardModel || !data) return null

  // access observable properties that should trigger re-renders
  data.collections.map(({ name }) => name)
  data.attributes.map(({ name }) => name)
  data.items.map(({ __id__ }) => __id__)
  data.selectionChanges   // eslint-disable-line no-unused-expressions

  return prf.measure("CaseCard.render", () => {
    // const context = new DGDataContext(data)
    const columnWidths: Record<string, number> = {}
    cardModel.attributeColumnWidths.forEach((colWidth, id) => {
      const collection = data.getCollection(`${id}`)
      if (collection) {
        columnWidths[collection.name] = colWidth
      }
    })

    // function handleResizeColumn(name: string, colWidth: number) {
    //   const collection = data?.getCollectionByName(name)
    //   if (collection) {
    //     data?.applyModelChange(() => {
    //       cardModel?.setAttributeColumnWidth(collection.id, colWidth)
    //     }, {
    //       undoStringKey: "DG.Undo.caseCard.columnWidthChange",
    //       redoStringKey: "DG.Redo.caseCard.columnWidthChange",
    //       log: "Resized column in case card"
    //     })
    //   }
    // }

    return (
      <>
        <div ref={mergeRefs} className="case-card react-data-card" data-testid="case-card">
          <CardView onNewCollectionDrop={handleNewCollectionDrop}/>
          <AttributeDragOverlay activeDragId={getOverlayDragId(active, instanceId, excludeDragOverlayRegEx)}/>
        </div>
      </>
    )
  })
})

          // {/* <div className="case-card-content">
          //   {collections.map((collection, i) => {
          //     const key = collection.id
          //     const parent = i > 0 ? collections[i - 1] : undefined
          //     const collectionClient = new V2CollectionClient(data, collection.id)

          //     return (
          //       <ParentCollectionContext.Provider key={key} value={parent?.id}>
          //         <CollectionContext.Provider value={collection.id}>
          //           <div className="case-card-collection">
          //             <CaseCard
          //             <table>
          //               <tbody>
          //                 <CollectionHeader
          //                   index={undefined}
          //                   collClient={collectionClient}
          //                   caseID={undefined}
          //                   columnWidthPct={0.5}
          //                   // onCollectionNameChange={}
          //                   // onHeaderWidthChange={}
          //                   // dragStatus={undefined}
          //                   />
          //               </tbody>
          //             </table>
          //           </div>
          //           <CollectionCard onMount={handleCollectionCardMount}
          //             onNewCollectionDrop={handleNewCollectionDrop} onTableScroll={handleTableScroll}
          //             onScrollClosestRowIntoView={handleScrollClosestRowIntoView} />
          //         </CollectionContext.Provider>
          //       </ParentCollectionContext.Provider>
          //     )
          //   })}
          //   {<AttributeDragOverlay activeDragId={overlayDragId} />}
          // </div> */}
