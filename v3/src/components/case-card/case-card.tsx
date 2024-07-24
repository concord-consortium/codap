import { useMergeRefs } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import React, { useRef } from "react"
import { useResizeDetector } from "react-resize-detector"
import { useDataSet } from "../../hooks/use-data-set"
import { useCaseCardModel } from "./use-case-card-model"
import { prf } from "../../utilities/profiler"

import { DG } from "../../v2/dg-compat.v2"
import { DGDataContext } from "../../models/v2/dg-data-context"

import "./case-card.v2"
const DGCaseCard = (DG.React as any).CaseCard

import "./case-card.scss"

interface IProps {
  setNodeRef: (element: HTMLElement | null) => void
}
export const CaseCard = observer(function CaseCard({ setNodeRef }: IProps) {
/*
  const { active } = useDndContext()
  const instanceId = useInstanceIdContext() || "case-card"
*/
  const {data, metadata} = useDataSet()
  const cardModel = useCaseCardModel()
  const containerRef = useRef<HTMLDivElement>(null)
  const mergeRefs = useMergeRefs<HTMLDivElement>(containerRef, setNodeRef)

  const { width, height } = useResizeDetector({ targetRef: containerRef })

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

  if (!cardModel || !data) return null

  // access observable properties that should trigger re-renders
  data.collections.map(({ name }) => name)
  data.attributes.map(({ name }) => name)
  data.items.map(({ __id__ }) => __id__)
  data.selectionChanges   // eslint-disable-line no-unused-expressions

  return prf.measure("CaseCard.render", () => {
    // disable the overlay for the index column
/*
    const overlayDragId = active && `${active.id}`.startsWith(instanceId) && !(`${active.id}`.endsWith(kIndexColumnKey))
                            ? `${active.id}` : undefined
*/

    const context = new DGDataContext(data)
    const columnWidths: Record<string, number> = {}
    cardModel.attributeColumnWidths.forEach((colWidth, id) => {
      const collection = data.getCollection(`${id}`)
      if (collection) {
        columnWidths[collection.name] = colWidth
      }
    })

    function handleResizeColumn(name: string, colWidth: number) {
      const collection = data?.getCollectionByName(name)
      if (collection) {
        data?.applyModelChange(() => {
          cardModel?.setAttributeColumnWidth(collection.id, colWidth)
        }, {
          undoStringKey: "DG.Undo.caseCard.columnWidthChange",
          redoStringKey: "DG.Redo.caseCard.columnWidthChange",
        })
      }
    }

    return (
      <>
        <div ref={mergeRefs} className="case-card react-data-card" data-testid="case-card">
          <DGCaseCard
            size={{ width, height }}
            context={context}
            columnWidthMap={columnWidths}
            isSelectedCallback={() => false}
            onResizeColumn={handleResizeColumn}
          />
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
