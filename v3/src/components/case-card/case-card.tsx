import { useMergeRefs } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import { useCallback, useRef } from "react"
// import { useResizeDetector } from "react-resize-detector"
import { useDataSet } from "../../hooks/use-data-set"
import { useInstanceIdContext } from "../../hooks/use-instance-id-context"
import { prf } from "../../utilities/profiler"
import { excludeDragOverlayRegEx } from "../case-tile-common/case-tile-types"
// import { DGDataContext } from "../../models/v2/dg-data-context"
import { AttributeDragOverlay } from "../drag-drop/attribute-drag-overlay"
import { CardView } from "./card-view"
import { FilterFormulaBar } from "../case-tile-common/filter-formula-bar"
import { useCaseCardModel } from "./use-case-card-model"
import { ICoreNotification } from "../../data-interactive/notification-core-types"
import { IDataSet } from "../../models/data/data-set"
import { ICollectionModel } from "../../models/data/collection"
import { createCollectionNotification, deleteCollectionNotification } from "../../models/data/data-set-notifications"
import { logMessageWithReplacement } from "../../lib/log-message"

// import "./case-card.v2"
import "./case-card.scss"

interface IProps {
  setNodeRef: (element: HTMLElement | null) => void
}
export const CaseCard = observer(function CaseCard({ setNodeRef }: IProps) {
  const instanceId = useInstanceIdContext() || "case-card"
  const {data} = useDataSet()
  const cardModel = useCaseCardModel()
  const containerRef = useRef<HTMLDivElement>(null)
  const mergeRefs = useMergeRefs<HTMLDivElement | null>(containerRef, setNodeRef)

  // const { width, height } = useResizeDetector({ targetRef: containerRef })

  // const { isTileSelected } = useTileModelContext()
  // const isFocused = isTileSelected()
  const lastNewCollectionDrop = useRef<{ newCollectionId: string, beforeCollectionId: string } | undefined>()

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

  if (!cardModel || !data) return null

  // access observable properties that should trigger re-renders
  data.collections.map(({ name }) => name)
  data.attributes.map(({ name }) => name)
  data.items.map(({ __id__ }) => __id__)
  data.selectionChanges   // eslint-disable-line @typescript-eslint/no-unused-expressions

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
        {data.hasFilterFormula && <FilterFormulaBar />}
        <div ref={mergeRefs} className="case-card react-data-card" data-testid="case-card">
          <CardView onNewCollectionDrop={handleNewCollectionDrop}/>
          <AttributeDragOverlay dragIdPrefix={instanceId} dragIdExcludeRegEx={excludeDragOverlayRegEx}/>
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
