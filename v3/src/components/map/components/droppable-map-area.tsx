import {Active, useDndContext} from "@dnd-kit/core"
import { useCallback } from "react"
import {IDataSet} from "../../../models/data/data-set"
import {getDragAttributeInfo, useDropHandler} from "../../../hooks/use-drag-drop"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {useMapModelContext} from "../hooks/use-map-model-context"
import {DroppableSvg} from "../../data-display/components/droppable-svg"
import {t} from "../../../utilities/translation/translate"

interface IProps {
  mapElt: HTMLDivElement | null
  targetElt: HTMLDivElement | SVGGElement | null
  onDropAttribute: (dataSet: IDataSet, attrId: string) => void
}

const computeDropHint = (active: Active) => {
  const {dataSet: draggedDataset, attributeId: dragAttrId = ""} = getDragAttributeInfo(active) || {}
  return t("V3.map.legendDrop", {vars: [draggedDataset?.attrFromID(dragAttrId)?.name]})
}

export const DroppableMapArea = ({mapElt, targetElt, onDropAttribute}: IProps) => {
  const instanceId = useInstanceIdContext(),
    mapModel = useMapModelContext(),
    droppableId = `${instanceId}-map-area-drop`,
    {active: currentActive} = useDndContext(),
    hintString = currentActive ? computeDropHint(currentActive) : ''

  const isDropAllowed = useCallback((dataset: IDataSet, attributeID?: string) => {
    return mapModel.placeCanAcceptAttributeIDDrop('legend', dataset, attributeID)
  }, [mapModel])

  const handleIsActive = useCallback((active: Active) => {
    const {dataSet, attributeId: droppedAttrId} = getDragAttributeInfo(active) || {}
    return !!dataSet && isDropAllowed(dataSet, droppedAttrId)
  }, [isDropAllowed])

  useDropHandler(droppableId, active => {
    const {dataSet, attributeId: dragAttributeID} = getDragAttributeInfo(active) || {}
    if (dataSet && dragAttributeID && isDropAllowed(dataSet, dragAttributeID)) {
      onDropAttribute(dataSet, dragAttributeID)
    }
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
