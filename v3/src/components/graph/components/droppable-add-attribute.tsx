import React from "react"
import {clsx} from "clsx"
import {Active, useDroppable} from "@dnd-kit/core"
import {useDropHintString} from "../../../hooks/use-drop-hint-string"
import {getDragAttributeId, useDropHandler} from "../../../hooks/use-drag-drop"
import {DropHint} from "./drop-hint"
import {graphPlaceToAttrRole, PlotType} from "../graphing-types"
import {useDataConfigurationContext} from "../hooks/use-data-configuration-context"

interface IAddAttributeProps {
  location: 'yPlus' | 'top' | 'rightNumeric'
  plotType: PlotType
  onDrop: (attributeId: string) => void
}

export const DroppableAddAttribute = ({location, plotType, onDrop}: IAddAttributeProps) => {
  const dataConfiguration = useDataConfigurationContext(),
    isDropAllowed = dataConfiguration?.graphPlaceCanAcceptAttributeIDDrop,
    droppableId = `graph-add-attribute-drop-${location}`,
    role = graphPlaceToAttrRole[location],
    {active, isOver, setNodeRef} = useDroppable({id: droppableId}),
    hintString = useDropHintString({ role, isDropAllowed})

  const handleIsActive = (iActive: Active) => {
    const droppedAttrId = getDragAttributeId(iActive) ?? ''
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
    const className = clsx(`add-attribute-drop-${location}`, { over: isActive && isOver, active: isActive })
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

