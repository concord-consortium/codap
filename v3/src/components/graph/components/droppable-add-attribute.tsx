import React from "react"
import {Active, useDroppable} from "@dnd-kit/core"
import {useDropHintString} from "../../../hooks/use-drop-hint-string"
import {getDragAttributeId, useDropHandler} from "../../../hooks/use-drag-drop"
import {DropHint} from "./drop-hint"
import {graphPlaceToAttrRole, IsGraphDropAllowed, PlotType} from "../graphing-types"

interface IAddAttributeProps {
  location: 'yPlus' | 'top' | 'rightNumeric'
  plotType: PlotType
  isDropAllowed?: IsGraphDropAllowed
  onDrop: (attributeId: string) => void
}

export const DroppableAddAttribute = ({location, plotType,
                                        isDropAllowed = () => true, onDrop}: IAddAttributeProps) => {
  const droppableId = `graph-add-attribute-drop-${location}`,
    role = graphPlaceToAttrRole[location],
    {active, isOver, setNodeRef} = useDroppable({id: droppableId}),
    hintString = useDropHintString({ role, isDropAllowed})

  const handleIsActive = (iActive: Active) => {
    const droppedAttrId = getDragAttributeId(iActive)
    if (isDropAllowed) {
      return isDropAllowed(location, droppedAttrId)
    } else {
      return !!droppedAttrId
    }
  }

  useDropHandler(droppableId, isActive => {
    const dragAttributeID = getDragAttributeId(isActive)
    dragAttributeID && onDrop(dragAttributeID)
  })

  if (plotType === 'scatterPlot') {
    const isActive = active && handleIsActive(active)
    const className = `add-attribute-drop-${location} ${isActive && isOver ? "over" : ""} ${isActive ? "active" : ""}`
    return (
      <div ref={setNodeRef} id={droppableId}
           className={className}>
        {isOver && hintString &&
           <DropHint hintText={hintString}/>
        }
      </div>
    )
  } else {
    return null
  }
}

