import { Active } from "@dnd-kit/core"
import React from "react"
import { getDragAttributeId, IDropData } from "../../../hooks/use-drag-drop"
import { useDropHintString } from "../../../hooks/use-drop-hint-string"
import { useInstanceIdContext } from "../../../hooks/use-instance-id-context"
import { GraphPlace } from "../models/axis-model"
import { DroppableSvg } from "./droppable-svg"
import { useDataConfigurationContext} from "../hooks/use-data-configuration-context";

interface IProps {
  graphElt: HTMLDivElement | null
  plotElt: SVGGElement | null
  onDropAttribute: (place: GraphPlace, attrId: string) => void
}
export const DroppablePlot = ({ graphElt, plotElt, onDropAttribute }: IProps) => {
  const instanceId = useInstanceIdContext()
  const dataConfig = useDataConfigurationContext()
  const droppableId = `${instanceId}-plot-area-drop`
  const role = dataConfig?.noAttributesAssigned ? 'x' : 'legend'
  const hintString = useDropHintString({ role })

  const handleIsActive = (active: Active) => !!getDragAttributeId(active)

  const handlePlotDropAttribute = (active: Active) => {
    const dragAttributeID = getDragAttributeId(active)
    if (dragAttributeID) {
      onDropAttribute('plot', dragAttributeID)
    }
  }

  const data: IDropData = {accepts: ["attribute"], onDrop: handlePlotDropAttribute}

  return (
    <DroppableSvg
      className="droppable-plot"
      portal={graphElt}
      target={plotElt}
      dropId={droppableId}
      dropData={data}
      onIsActive={handleIsActive}
      hintString={hintString}
    />
  )
}
