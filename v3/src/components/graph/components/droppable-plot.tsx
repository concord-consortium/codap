import {Active} from "@dnd-kit/core"
import React, {memo} from "react"
import {getDragAttributeId, useDropHandler} from "../../../hooks/use-drag-drop"
import {useDropHintString} from "../../../hooks/use-drop-hint-string"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {GraphPlace} from "../graphing-types"
import {DroppableSvg} from "./droppable-svg"
import {useDataConfigurationContext} from "../hooks/use-data-configuration-context"

interface IProps {
  graphElt: HTMLDivElement | null
  plotElt: SVGGElement | null
  onDropAttribute: (place: GraphPlace, attrId: string) => void
}

const handleIsActive = (active: Active) => !!getDragAttributeId(active)

const _DroppablePlot = ({ graphElt, plotElt, onDropAttribute }: IProps) => {
  const instanceId = useInstanceIdContext()
  const dataConfig = useDataConfigurationContext()
  const droppableId = `${instanceId}-plot-area-drop`
  const role = dataConfig?.noAttributesAssigned ? 'x' : 'legend'
  const hintString = useDropHintString({ role })

  useDropHandler(droppableId, active => {
    const dragAttributeID = getDragAttributeId(active)
    dragAttributeID && onDropAttribute('plot', dragAttributeID)
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
