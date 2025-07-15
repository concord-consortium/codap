import React, {useCallback, useEffect, useRef, useState} from "react"
import {autorun} from "mobx"
import {observer} from "mobx-react-lite"
import {isAlive} from "mobx-state-tree"
import {select} from "d3"
import {Active} from "@dnd-kit/core"
import {getDragAttributeInfo, useDropHandler} from "../../../hooks/use-drag-drop"
import {useDropHintString} from "../../../hooks/use-drop-hint-string"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {useGraphDataConfigurationContext} from "../hooks/use-graph-data-configuration-context"
import {useGraphContentModelContext} from "../hooks/use-graph-content-model-context"
import {useGraphLayoutContext} from "../hooks/use-graph-layout-context"
import {AttributeType} from "../../../models/data/attribute-types"
import {IDataSet} from "../../../models/data/data-set"
import {AxisPlace} from "../../axis/axis-types"
import {Axis} from "../../axis/components/axis"
import {GraphPlace} from "../../axis-graph-shared"
import {axisPlaceToAttrRole} from "../../data-display/data-display-types"
import {kGraphClassSelector} from "../graphing-types"
import {DroppableAxis} from "./droppable-axis"
import {GraphAttributeLabel} from "./graph-attribute-label"

interface IProps {
  place: AxisPlace
  onDropAttribute?: (place: GraphPlace, dataSet: IDataSet, attrId: string) => void
  onRemoveAttribute?: (place: GraphPlace, attrId: string) => void
  onTreatAttributeAs?: (place: GraphPlace, attrId: string, treatAs: AttributeType) => void
}

const trueFn = () => true

export const GraphAxis = observer(function GraphAxis(
  {place, onDropAttribute, onRemoveAttribute, onTreatAttributeAs}: IProps) {
  const dataConfig = useGraphDataConfigurationContext(),
    isDropAllowed = dataConfig?.placeCanAcceptAttributeIDDrop ?? trueFn,
    graphModel = useGraphContentModelContext(),
    axisModel = graphModel.getAxis?.(place),
    instanceId = useInstanceIdContext(),
    layout = useGraphLayoutContext(),
    droppableId = `${instanceId}-${place}-axis-drop`,
    hintString = useDropHintString({role: axisPlaceToAttrRole[place]}),
    parentEltRef = useRef<HTMLDivElement | null>(null),
    [wrapperElt, _setWrapperElt] = useState<SVGGElement | null>(null),
    setWrapperElt = useCallback((elt: SVGGElement | null) => {
      parentEltRef.current = elt?.closest(kGraphClassSelector) as HTMLDivElement ?? null
      _setWrapperElt(elt)
    }, [])
  const handleIsActive = useCallback((active: Active) => {
    const {dataSet, attributeId: droppedAttrId} = getDragAttributeInfo(active) || {}
    if (isDropAllowed) {
      return isDropAllowed(place, dataSet, droppedAttrId)
    } else {
      return !!droppedAttrId
    }
  }, [isDropAllowed, place])
  useDropHandler(droppableId, active => {
    const {dataSet, attributeId: droppedAttrId} = getDragAttributeInfo(active) || {}
    dataSet && droppedAttrId && isDropAllowed(place, dataSet, droppedAttrId) &&
      onDropAttribute?.(place, dataSet, droppedAttrId)
  })

  /**
   * Because the interior of the graph (the plot) can be transparent, we have to put a background behind
   * axes and legends. Furthermore, there are some rectangles that aren't even part of these that we have
   * to special case.
   */
  useEffect(function installBackground() {
    return autorun(() => {
      if (wrapperElt) {
        const bounds = layout.getComputedBounds(place),
          graphWidth = layout.tileWidth,
          left = ['bottom', 'top'].includes(place) ? 0 : bounds.left,
          width = ['bottom', 'top'].includes(place) ? graphWidth : bounds.width,
          transform = `translate(${left}, ${bounds.top})`
        select(wrapperElt)
          .selectAll<SVGRectElement, number>('rect.axis-background')
          .attr('transform', transform)
          .attr('width', Math.max(0, width))
          .attr('height', Math.max(0, bounds.height))
      }
    }, { name: "GraphAxis.installBackground" })
  }, [layout, place, wrapperElt])

  useEffect(function cleanup() {
    return () => {
      // This gets called when the component is unmounted, which happens when the graph is closed.
      // In that case setting the desired extent in the layout will cause MST model errors.
      if (isAlive(graphModel)) {
        layout.setDesiredExtent(place, 0)
      }
    }
  }, [layout, place, graphModel])

  return (
    <g className={`axis-wrapper ${place}`} ref={elt => setWrapperElt(elt)}>
      <rect className='axis-background'/>
      {axisModel &&
        <Axis axisPlace={place}
              showScatterPlotGridLines={graphModel.axisShouldShowGridLines(place)}
              showZeroAxisLine={graphModel.axisShouldShowZeroLine(place)}
        />}
      <GraphAttributeLabel
        place={place}
        onChangeAttribute={onDropAttribute}
        onRemoveAttribute={onRemoveAttribute}
        onTreatAttributeAs={onTreatAttributeAs}
      />
      {onDropAttribute &&
        <DroppableAxis
            place={place}
            dropId={droppableId}
            hintString={hintString}
            portal={parentEltRef.current}
            target={wrapperElt}
            onIsActive={handleIsActive}
        />}
    </g>
  )
})
