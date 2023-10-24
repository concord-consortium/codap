import React, {MutableRefObject, useCallback, useEffect, useRef, useState} from "react"
import {autorun} from "mobx"
import {observer} from "mobx-react-lite"
import {isAlive} from "mobx-state-tree"
import {select} from "d3"
import {Active} from "@dnd-kit/core"
import {getDragAttributeInfo, useDropHandler} from "../../../hooks/use-drag-drop"
import {useDropHintString} from "../../../hooks/use-drop-hint-string"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {useGraphDataConfigurationContext} from "../hooks/use-data-configuration-context"
import {useGraphContentModelContext} from "../hooks/use-graph-content-model-context"
import {AttributeType} from "../../../models/data/attribute"
import {IDataSet} from "../../../models/data/data-set"
import {useGraphLayoutContext} from "../models/graph-layout"
import {AxisPlace} from "../../axis/axis-types"
import {Axis} from "../../axis/components/axis"
import {GraphPlace} from "../../axis-graph-shared"
import {axisPlaceToAttrRole, kGraphClassSelector} from "../graphing-types"
import {DroppableAxis} from "./droppable-axis"
import {AttributeLabel} from "./attribute-label"

interface IProps {
  place: AxisPlace
  enableAnimation: MutableRefObject<boolean>
  onDropAttribute?: (place: GraphPlace, dataSet: IDataSet, attrId: string) => void
  onRemoveAttribute?: (place: GraphPlace, attrId: string) => void
  onTreatAttributeAs?: (place: GraphPlace, attrId: string, treatAs: AttributeType) => void
}

export const GraphAxis = observer(function GraphAxis(
  {place, enableAnimation, onDropAttribute, onRemoveAttribute, onTreatAttributeAs}: IProps) {
  const dataConfig = useGraphDataConfigurationContext(),
    isDropAllowed = dataConfig?.graphPlaceCanAcceptAttributeIDDrop ?? (() => true),
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
  const handleIsActive = (active: Active) => {
    const {dataSet, attributeId: droppedAttrId} = getDragAttributeInfo(active) || {}
    if (isDropAllowed) {
      return isDropAllowed(place, dataSet, droppedAttrId)
    } else {
      return !!droppedAttrId
    }
  }
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
          graphWidth = layout.graphWidth,
          left = ['bottom', 'top'].includes(place) ? 0 : bounds.left,
          width = ['bottom', 'top'].includes(place) ? graphWidth : bounds.width,
          transform = `translate(${left}, ${bounds.top})`
        select(wrapperElt)
          .selectAll<SVGRectElement, number>('rect.axis-background')
          .attr('transform', transform)
          .attr('width', width)
          .attr('height', bounds.height)
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
    <g className='axis-wrapper' ref={elt => setWrapperElt(elt)}>
      <rect className='axis-background'/>
      {axisModel &&
        <Axis axisPlace={place}
              enableAnimation={enableAnimation}
              showScatterPlotGridLines={graphModel.axisShouldShowGridLines(place)}
              centerCategoryLabels={graphModel.dataConfiguration.categoriesForAxisShouldBeCentered(place)}
        />}
      <AttributeLabel
        place={place}
        onChangeAttribute={onDropAttribute}
        onRemoveAttribute={onRemoveAttribute}
        onTreatAttributeAs={onTreatAttributeAs}
      />
      {onDropAttribute &&
        <DroppableAxis
            place={`${place}`}
            dropId={droppableId}
            hintString={hintString}
            portal={parentEltRef.current}
            target={wrapperElt}
            onIsActive={handleIsActive}
        />}
    </g>
  )
})
