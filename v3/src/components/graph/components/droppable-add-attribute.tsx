import React from "react"
import {useDroppable} from "@dnd-kit/core"
import {useDropHintString} from "../../../hooks/use-drop-hint-string"
import {getDragAttributeId, useDropHandler} from "../../../hooks/use-drag-drop"
import {DropHint} from "./drop-hint"
import {PlotType} from "../graphing-types"

interface IAddAttributeProps {
  plotType: PlotType
  onDrop: (attributeId: string) => void
}

export const DroppableAddAttribute = ({plotType, onDrop}: IAddAttributeProps) => {
  const droppableId = "graph-add-attribute-drop",
    {active, isOver, setNodeRef} = useDroppable({id: droppableId}),
    hintString = useDropHintString({role: 'yPlus'})
  useDropHandler(droppableId, isActive => {
    const dragAttributeID = getDragAttributeId(isActive)
    dragAttributeID && onDrop(dragAttributeID)
  })
  if (plotType === 'scatterPlot') {
    return (
      <div ref={setNodeRef} id={droppableId}
           className={`add-attribute-drop ${isOver ? "over" : ""} ${active ? "active" : ""} }`}>
        {isOver && hintString &&
           <DropHint hintText={hintString}/>
        }
      </div>
    )
  } else {
    return null
  }
}

