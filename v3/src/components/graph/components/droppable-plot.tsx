import {Active} from "@dnd-kit/core"
import {memo} from "react"
import {getDragAttributeInfo, useDropHandler} from "../../../hooks/use-drag-drop"
import {useDropHintString} from "../../../hooks/use-drop-hint-string"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {DroppableSvg} from "../../data-display/components/droppable-svg"
import {useGraphDataConfigurationContext} from "../hooks/use-graph-data-configuration-context"
import {GraphPlace} from "../../axis-graph-shared"
import {IDataSet} from "../../../models/data/data-set"

interface IProps {
  graphElt: HTMLDivElement | null
  plotElt: SVGGElement | null
  onDropAttribute: (place: GraphPlace, dataSet: IDataSet, attrId: string) => void
}

const DroppablePlotBase = ({graphElt, plotElt, onDropAttribute}: IProps) => {
  const instanceId = useInstanceIdContext()
  const dataConfig = useGraphDataConfigurationContext()
  const isDropAllowed = dataConfig?.placeCanAcceptAttributeIDDrop ?? (() => true)
  const droppableId = `${instanceId}-plot-area-drop`
  const place: GraphPlace = dataConfig?.noAttributesAssigned ? 'bottom' : 'legend'
  const role = dataConfig?.noAttributesAssigned ? 'x' : 'legend'
  const hintString = useDropHintString({role})

  const handleIsActive = (active: Active) => {
    const { dataSet, attributeId: droppedAttrId } = getDragAttributeInfo(active) || {}
    if (isDropAllowed) {
      return isDropAllowed(place, dataSet, droppedAttrId)
    } else {
      return !!droppedAttrId
    }
  }

  useDropHandler(droppableId, active => {
    const { dataSet, attributeId: dragAttributeID } = getDragAttributeInfo(active) || {}
    dataSet && dragAttributeID && isDropAllowed(place, dataSet, dragAttributeID) &&
      onDropAttribute(place, dataSet, dragAttributeID)
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
export const DroppablePlot = memo(DroppablePlotBase)
