import React from "react"
import {clsx} from "clsx"
import {Active, useDroppable} from "@dnd-kit/core"
import {useDropHintString} from "../../../hooks/use-drop-hint-string"
import {getDragAttributeInfo, useDropHandler} from "../../../hooks/use-drag-drop"
import {DropHint} from "./drop-hint"
import {graphPlaceToAttrRole, PlotType} from "../graphing-types"
import {GraphPlace} from "../../axis-graph-shared"
import {useDataConfigurationContext} from "../hooks/use-data-configuration-context"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {IDataSet} from "../../../models/data/data-set"

interface IAddAttributeProps {
  place: GraphPlace
  plotType: PlotType
  onDrop: (dataSet: IDataSet, attributeId: string) => void
}

export const DroppableAddAttribute = ({place, onDrop}: IAddAttributeProps) => {
  const graphID = useInstanceIdContext(),
    dataConfiguration = useDataConfigurationContext(),
    isDropAllowed = dataConfiguration?.graphPlaceCanAcceptAttributeIDDrop,
    droppableId = `${graphID}-add-attribute-${place}-drop`,
    role = graphPlaceToAttrRole[place],
    {active, isOver, setNodeRef} = useDroppable({id: droppableId}),
    hintString = useDropHintString({role})

  const handleIsActive = (iActive: Active) => {
    const { dataSet, attributeId: droppedAttrId } = getDragAttributeInfo(iActive) || {}
    if (isDropAllowed) {
      return isDropAllowed(place, dataSet, droppedAttrId)
    } else {
      return !!droppedAttrId
    }
  }

  useDropHandler(droppableId, iActive => {
    const { dataSet, attributeId: dragAttributeID } = getDragAttributeInfo(active) || {}
    dataSet && dragAttributeID && onDrop(dataSet, dragAttributeID)
  })

  const isActive = active && handleIsActive(active),
    placeKey = ['rightNumeric', 'rightCat'].includes(place) ? 'right' : place // both use same css
  const className = clsx(`add-attribute-drop-${placeKey}`, {over: isActive && isOver, active: isActive})
  return isActive ? (
    <div ref={setNodeRef} id={droppableId}
         className={className}>
      {isOver && hintString &&
         <DropHint hintText={hintString}/>
      }
    </div>
  ) : null
}
