import {clsx} from "clsx"
import {Active, useDroppable} from "@dnd-kit/core"
import {CSSProperties} from "react"
import {useDropHintString} from "../../../hooks/use-drop-hint-string"
import {getDragAttributeInfo, useDropHandler} from "../../../hooks/use-drag-drop"
import {kDropZoneGap, kDropZoneSize, PlotType} from "../graphing-types"
import {GraphPlace} from "../../axis-graph-shared"
import {DropHint} from "../../data-display/components/drop-hint"
import {graphPlaceToAttrRole} from "../../data-display/data-display-types"
import {useGraphDataConfigurationContext} from "../hooks/use-graph-data-configuration-context"
import {useGraphLayoutContext} from "../hooks/use-graph-layout-context"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {IDataSet} from "../../../models/data/data-set"

interface IAddAttributeProps {
  place: GraphPlace
  plotType: PlotType
  hasRightDropZone?: boolean
  onDrop: (dataSet: IDataSet, attributeId: string) => void
}

export const DroppableAddAttribute = ({place, hasRightDropZone, onDrop}: IAddAttributeProps) => {
  const layout = useGraphLayoutContext()
  const graphID = useInstanceIdContext(),
    dataConfiguration = useGraphDataConfigurationContext(),
    isDropAllowed = dataConfiguration?.placeCanAcceptAttributeIDDrop,
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
    const { dataSet, attributeId: dragAttributeID } = getDragAttributeInfo(iActive) || {}
    if (dataSet && dragAttributeID && (!isDropAllowed || isDropAllowed(place, dataSet, dragAttributeID))) {
      onDrop(dataSet, dragAttributeID)
    }
  })

  const isActive = active && handleIsActive(active),
    placeKey = ['rightNumeric', 'rightCat'].includes(place) ? 'right' : place // both use same css
  const className = clsx(`add-attribute-drop-${placeKey}`, {over: isActive && isOver, active: isActive})

  // Use plot bounds to constrain drop zone dimensions to the plot area,
  // inset by kDropZoneGap to create a visible gap between adjacent drop zones.
  const plotBounds = layout?.getComputedBounds("plot")
  const style: CSSProperties | undefined = (() => {
    if (!plotBounds) return undefined
    if (placeKey === "right") {
      return { height: Math.max(0, plotBounds.height - kDropZoneGap), top: plotBounds.top + kDropZoneGap }
    }
    if (placeKey === "top" || placeKey === "yPlus") {
      const rightInset = hasRightDropZone ? kDropZoneSize + kDropZoneGap : 0
      return { width: Math.max(0, plotBounds.width - kDropZoneGap - rightInset), left: plotBounds.left + kDropZoneGap }
    }
  })()

  return isActive ? (
    <div ref={setNodeRef} id={droppableId} className={className} style={style}
      data-testid={`add-attribute-drop-${place}`}>
      <DropHint hintText={hintString} isVisible={isOver}/>
    </div>
  ) : null
}
