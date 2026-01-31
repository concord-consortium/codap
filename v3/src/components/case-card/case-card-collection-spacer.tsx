import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { useRef } from "react"
import { useDataSetContext } from "../../hooks/use-data-set-context"
import { getDragAttributeInfo, useTileDroppable } from "../../hooks/use-drag-drop"
import { IDataSet } from "../../models/data/data-set"
import { preventAttributeMove, preventCollectionReorg } from "../../utilities/plugin-utils"
import { t } from "../../utilities/translation/translate"

import "./case-card-collection-spacer.scss"

interface IProps {
  onDrop: (dataSet: IDataSet, attrId: string, collId: string) => void
  collectionId: string
}

export const CaseCardCollectionSpacer = observer(function CaseCardCollectionSpacer({ onDrop, collectionId }: IProps) {
  const data = useDataSetContext()
  const parentCollectionId = data?.getCollection(collectionId)?.parent?.id
  const parentMost = !parentCollectionId
  const preventCollectionDrop = preventCollectionReorg(data, collectionId)

  const { active, isOver, setNodeRef } = useTileDroppable(`new-collection-${collectionId}`, _active => {
    if (!preventCollectionDrop) {
      const { dataSet, attributeId: dragAttributeID } = getDragAttributeInfo(_active) || {}
      if (preventAttributeMove(dataSet, dragAttributeID)) return
      dataSet && dragAttributeID && onDrop?.(dataSet, dragAttributeID, collectionId)
    }
  })

  const dragAttributeInfo = getDragAttributeInfo(active)
  const preventAttributeDrag = preventAttributeMove(data, dragAttributeInfo?.attributeId)
  const preventDrop = preventAttributeDrag || preventCollectionDrop
  const isOverAndCanDrop = isOver && !preventDrop

  const classes = clsx("case-card-collection-spacer",
    { active: !!dragAttributeInfo && !preventDrop, over: isOverAndCanDrop, parentMost })

  const cardSpacerDivRef = useRef<HTMLElement | null>(null)

  const handleRef = (element: HTMLElement | null) => {
    cardSpacerDivRef.current = element
    setNodeRef(element)
  }

  if (!data) return null

  return (
    <div className={classes} ref={handleRef}>
      <div className="drop-message">{isOverAndCanDrop ? t("DG.CaseTableDropTarget.dropMessage") : ""}</div>
    </div>
  )
})
