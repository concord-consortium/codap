import t from "../../../utilities/translation/translate"
import {Active, useDndContext} from "@dnd-kit/core"
import React from "react"
import {IDataSet} from "../../../models/data/data-set"
import {getDragAttributeInfo, useDropHandler} from "../../../hooks/use-drag-drop"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {useMapModelContext} from "../hooks/use-map-model-context"
import {DroppableSvg} from "../../data-display/components/droppable-svg"

interface IProps {
  mapElt: HTMLDivElement | null
  targetElt: SVGGElement | null
  onDropAttribute: (dataSet: IDataSet, attrId: string) => void
}

const computeDropHint = (active: Active) => {
    const {dataSet: draggedDataset, attributeId: dragAttrId = ""} = getDragAttributeInfo(active) || {}
    return t("V3.map.legendDrop", {vars: [draggedDataset?.attrFromID(dragAttrId)?.name]})
}

export const DroppableMapArea = ({mapElt, targetElt, onDropAttribute}: IProps) => {
  const instanceId = useInstanceIdContext(),
    mapModel = useMapModelContext(),
    isDropAllowed = mapModel.canAcceptAttributeIDDrop ?? (() => true),
    droppableId = `${instanceId}-map-area-drop`,
    {active: currentActive} = useDndContext(),
    hintString = currentActive ? computeDropHint(currentActive) : ''

    const handleIsActive = (active: Active) => {
      const {dataSet, attributeId: droppedAttrId} = getDragAttributeInfo(active) || {}
      if (isDropAllowed) {
        return isDropAllowed(dataSet, droppedAttrId)
      } else {
        return !!droppedAttrId
      }
    }

  useDropHandler(droppableId, active => {
    const {dataSet, attributeId: dragAttributeID} = getDragAttributeInfo(active) || {}
    dataSet && dragAttributeID && isDropAllowed(dataSet, dragAttributeID) &&
    onDropAttribute(dataSet, dragAttributeID)
  })

  return (
    <DroppableSvg
      className="droppable-plot"
      portal={mapElt}
      target={targetElt}
      dropId={droppableId}
      onIsActive={handleIsActive}
      hintString={hintString}
    />
  )
}
