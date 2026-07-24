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
  hasTopAxis?: boolean
  onDrop: (dataSet: IDataSet, attributeId: string) => void
}

export const DroppableAddAttribute = ({place, hasRightDropZone, hasTopAxis, onDrop}: IAddAttributeProps) => {
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
    // Only inset by the portion of the right-edge drop zone that would actually overlap.
    const rightAxisExtent =
      layout.getDesiredExtent('rightNumeric') + layout.getDesiredExtent('rightCat')
    const rightInset = hasRightDropZone
      ? Math.max(0, kDropZoneSize + kDropZoneGap - rightAxisExtent)
      : 0
    if (placeKey === "yPlus" && hasTopAxis) {
      // A top axis already occupies the wide strip across the top of the plot, so narrow
      // the yPlus drop zone to just the y-axis column. Makes it clear the drop will add
      // another y attribute rather than a top-axis category.
      return { width: Math.max(0, plotBounds.left - kDropZoneGap), left: 0 }
    }
    if (placeKey === "yPlus") {
      // Span the entire top of the graph including the y-axis column, matching v2's
      // full-width strip and giving the "+" a place to sit over the y-axis.
      return { width: Math.max(0, plotBounds.left + plotBounds.width - kDropZoneGap - rightInset), left: 0 }
    }
    if (placeKey === "top") {
      // Plot-split (categorical) is bounded by the plot area only.
      return { width: Math.max(0, plotBounds.width - kDropZoneGap - rightInset), left: plotBounds.left + kDropZoneGap }
    }
  })()

  // "+" only on yPlus (multi-y numeric on scatterplot).
  const showPlusIcon = place === 'yPlus'
  // Half the drop-zone height. Set inline to override `.graph-plot svg { width/height: 100% }`.
  const kPlusSize = kDropZoneSize / 2
  const plusStyle: CSSProperties = { width: kPlusSize, height: kPlusSize }

  return isActive ? (
    <div ref={setNodeRef} id={droppableId} className={className} style={style}
      data-testid={`add-attribute-drop-${place}`}>
      {showPlusIcon && (
        <svg className="add-attribute-plus" style={plusStyle} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="6"/>
        </svg>
      )}
      <DropHint hintText={hintString} isVisible={isOver}/>
    </div>
  ) : null
}
