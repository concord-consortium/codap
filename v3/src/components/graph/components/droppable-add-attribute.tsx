import React from "react"
import {Active, useDroppable} from "@dnd-kit/core"
import {useDropHintString} from "../../../hooks/use-drop-hint-string"
import {getDragAttributeId, useDropHandler} from "../../../hooks/use-drag-drop"
import {DropHint} from "./drop-hint"
import {IsGraphDropAllowed, PlotType} from "../graphing-types"

interface IAddAttributeProps {
  location: 'top' | 'rightNumeric'
  plotType: PlotType
  isDropAllowed?: IsGraphDropAllowed
  onDrop: (attributeId: string) => void
}

export const DroppableAddAttribute = ({location, plotType,
                                        isDropAllowed = () => true, onDrop}: IAddAttributeProps) => {
  const droppableId = `graph-add-attribute-drop-${location}`,
    {active, isOver, setNodeRef} = useDroppable({id: droppableId}),
    hintString = useDropHintString({role: 'yPlus', isDropAllowed})

  const handleIsActive = (iActive: Active) => {
    const droppedAttrId = getDragAttributeId(iActive)
    if (isDropAllowed) {
      return isDropAllowed('legend', droppedAttrId)
    } else {
      return !!droppedAttrId
    }
  }

  useDropHandler(droppableId, isActive => {
    const dragAttributeID = getDragAttributeId(isActive)
    dragAttributeID && onDrop(dragAttributeID)
  })

  if (plotType === 'scatterPlot') {
    return (
      <div ref={setNodeRef} id={droppableId}
           className={`add-attribute-drop-${location} ${active && isOver ? "over" : ""} ${active ? "active" : ""} }`}>
        {isOver && hintString &&
           <DropHint hintText={hintString}/>
        }
      </div>
    )
  } else {
    return null
  }
}

