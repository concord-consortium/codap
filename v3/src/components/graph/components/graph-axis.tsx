import React, {MutableRefObject, useCallback, useEffect, useRef, useState} from "react"
import {observer} from "mobx-react-lite"
import {isAlive} from "mobx-state-tree"
import {Active} from "@dnd-kit/core"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {AttributeType} from "../../../models/data/attribute"
import {IDataSet} from "../../../models/data/data-set"
import {useGraphModelContext} from "../models/graph-model"
import {useDataConfigurationContext} from "../hooks/use-data-configuration-context"
import {useGraphLayoutContext} from "../models/graph-layout"
import {getDragAttributeInfo, useDropHandler} from "../../../hooks/use-drag-drop"
import {AxisPlace} from "../../axis/axis-types"
import {Axis} from "../../axis/components/axis"
import {axisPlaceToAttrRole, kGraphClassSelector} from "../graphing-types"
import {GraphPlace} from "../../axis-graph-shared"
import {DroppableAxis} from "./droppable-axis"
import {AttributeLabel} from "./attribute-label"
import {useDropHintString} from "../../../hooks/use-drop-hint-string"

interface IProps {
  place: AxisPlace
  enableAnimation: MutableRefObject<boolean>
  onDropAttribute?: (place: GraphPlace, dataSet: IDataSet, attrId: string) => void
  onRemoveAttribute?: (place: GraphPlace, attrId: string) => void
  onTreatAttributeAs?: (place: GraphPlace, attrId: string, treatAs: AttributeType) => void
}

export const GraphAxis = observer(function GraphAxis(
  {place, enableAnimation, onDropAttribute, onRemoveAttribute, onTreatAttributeAs}: IProps) {
  const dataConfig = useDataConfigurationContext(),
    isDropAllowed = dataConfig?.graphPlaceCanAcceptAttributeIDDrop ?? (() => true),
    graphModel = useGraphModelContext(),
    axisModel = graphModel?.getAxis(place),
    instanceId = useInstanceIdContext(),
    layout = useGraphLayoutContext(),
    droppableId = `${instanceId}-${place}-axis-drop`,
    hintString = useDropHintString({role: axisPlaceToAttrRole[place]})

  const parentEltRef = useRef<HTMLDivElement | null>(null),
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
      {axisModel &&
         <Axis axisModel={axisModel}
             label={''}  // Remove
             enableAnimation={enableAnimation}
             showScatterPlotGridLines={graphModel.axisShouldShowGridLines(place)}
             centerCategoryLabels={graphModel.config.categoriesForAxisShouldBeCentered(place)}
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
