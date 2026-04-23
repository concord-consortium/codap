import { useMergeRefs } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import { useCallback, useRef } from "react"
import { useDataSet } from "../../hooks/use-data-set"
import { useInstanceIdContext } from "../../hooks/use-instance-id-context"
import { prf } from "../../utilities/profiler"
import { excludeDragOverlayRegEx } from "../case-tile-common/case-tile-types"
import { AttributeDragOverlay } from "../drag-drop/attribute-drag-overlay"
import { CardView } from "./card-view"
import { FilterFormulaBar } from "../case-tile-common/filter-formula-bar"
import { useCaseCardModel } from "./use-case-card-model"
import { ICoreNotification } from "../../data-interactive/notification-core-types"
import { IDataSet } from "../../models/data/data-set"
import { ICollectionModel } from "../../models/data/collection"
import { createCollectionNotification, deleteCollectionNotification } from "../../models/data/data-set-notifications"
import { logMessageWithReplacement } from "../../lib/log-message"

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

  const handleResizeColumn = useCallback((collectionId: string, widthPct: number, isComplete?: boolean) => {
    if (isComplete && data && cardModel) {
      data.applyModelChange(() => {
        cardModel.setAttributeColumnWidth(collectionId, widthPct)
      }, {
        undoStringKey: "DG.Undo.caseCard.columnWidthChange",
        redoStringKey: "DG.Redo.caseCard.columnWidthChange",
        log: logMessageWithReplacement(
          "Change case card column width for collection '%@' to '%@'%",
          {collection: data.getCollection(collectionId)?.name, width: Math.round(widthPct * 10000) / 100}
        )
      })
    }
  }, [cardModel, data])

  if (!cardModel || !data) return null

  // access observable properties that should trigger re-renders
  data.collections.map(({ name }) => name)
  data.attributes.map(({ name }) => name)
  data.items.map(({ __id__ }) => __id__)
  data.selectionChanges   // eslint-disable-line @typescript-eslint/no-unused-expressions

  return prf.measure("CaseCard.render", () => {
    return (
      <>
        {data.hasFilterFormula && <FilterFormulaBar />}
        <div ref={mergeRefs} className="case-card react-data-card" data-testid="case-card">
          <CardView onNewCollectionDrop={handleNewCollectionDrop} onResizeColumn={handleResizeColumn}/>
          <AttributeDragOverlay dragIdPrefix={instanceId} dragIdExcludeRegEx={excludeDragOverlayRegEx}/>
        </div>
      </>
    )
  })
})
