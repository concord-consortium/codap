import {Active} from "@dnd-kit/core"
import React, {memo} from "react"
import {getDragAttributeInfo, useDropHandler} from "../../../hooks/use-drag-drop"
import {useDropHintString} from "../../../hooks/use-drop-hint-string"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {DroppableSvg} from "./droppable-svg"
import {useDataConfigurationContext} from "../hooks/use-data-configuration-context"
import {GraphPlace} from "../../axis-graph-shared"
import {IDataSet} from "../../../models/data/data-set"

interface IProps {
  graphElt: HTMLDivElement | null
  plotElt: SVGGElement | null
  onDropAttribute: (place: GraphPlace, dataSet: IDataSet, attrId: string) => void
}

const _DroppablePlot = ({graphElt, plotElt, onDropAttribute}: IProps) => {
  const instanceId = useInstanceIdContext()
  const dataConfig = useDataConfigurationContext()
  const isDropAllowed = dataConfig?.graphPlaceCanAcceptAttributeIDDrop ?? (() => true)
  const droppableId = `${instanceId}-plot-area-drop`
  const role = dataConfig?.noAttributesAssigned ? 'x' : 'legend'
  const hintString = useDropHintString({role})

  const handleIsActive = (active: Active) => {
    const { dataSet, attributeId: droppedAttrId } = getDragAttributeInfo(active) || {}
    if (isDropAllowed) {
      return isDropAllowed('legend', dataSet, droppedAttrId)
    } else {
      return !!droppedAttrId
    }
  }

  useDropHandler(droppableId, active => {
    const { dataSet, attributeId: dragAttributeID } = getDragAttributeInfo(active) || {}
    dataSet && dragAttributeID && isDropAllowed('legend', dataSet, dragAttributeID) &&
      onDropAttribute('plot', dataSet, dragAttributeID)
  })

  return (
    <DroppableSvg
      className="droppable-plot"
      portal={graphElt}
      target={plotElt}
      dropId={droppableId}
      onIsActive={handleIsActive}
      hintString={hintString}
    />
  )
}
export const DroppablePlot = memo(_DroppablePlot)
