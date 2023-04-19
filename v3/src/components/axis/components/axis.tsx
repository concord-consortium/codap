import {Active} from "@dnd-kit/core"
import React, {MutableRefObject, useRef, useState} from "react"
import {createPortal} from "react-dom"
import {range} from "d3"
import {DroppableAxis} from "./droppable-axis"
import {axisPlaceToAttrRole, GraphPlace, IsGraphDropAllowed} from "../../graph/graphing-types"
import {useAxisBoundsProvider} from "../hooks/use-axis-bounds"
import {getDragAttributeId, useDropHandler} from "../../../hooks/use-drag-drop"
import {useDropHintString} from "../../../hooks/use-drop-hint-string"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {useAxis} from "../hooks/use-axis"
import {useAxisLayoutContext} from "../models/axis-layout-context"
import {IAxisModel} from "../models/axis-model"
import {AttributeType} from "../../../models/data/attribute"
import {AxisOrLegendAttributeMenu} from "./axis-or-legend-attribute-menu"
import {SubAxis} from "./sub-axis"

import "./axis.scss"

interface IProps {
  parentSelector: string
  getAxisModel: () => IAxisModel | undefined
  label?: string
  enableAnimation: MutableRefObject<boolean>
  showScatterPlotGridLines?: boolean
  centerCategoryLabels?: boolean
  isDropAllowed?: IsGraphDropAllowed
  onDropAttribute?: (place: GraphPlace, attrId: string) => void
  onRemoveAttribute?: (place: GraphPlace, attrId: string) => void
  onTreatAttributeAs?: (place: GraphPlace, attrId: string, treatAs: AttributeType) => void
}

export const Axis = ({
                       parentSelector, label, getAxisModel, showScatterPlotGridLines = false,
                       centerCategoryLabels = true, isDropAllowed = () => true, onDropAttribute,
                       enableAnimation, onTreatAttributeAs, onRemoveAttribute
                     }: IProps) => {
  const
    instanceId = useInstanceIdContext(),
    axisModel = getAxisModel(),
    layout = useAxisLayoutContext(),
    place = axisModel?.place || 'bottom',
    droppableId = `${instanceId}-${place}-axis-drop`,
    hintString = useDropHintString({role: axisPlaceToAttrRole[place]}),
    [axisElt, setAxisElt] = useState<SVGGElement | null>(null),
    titleRef = useRef<SVGGElement | null>(null)

  const handleIsActive = (active: Active) => {
    const droppedAttrId = getDragAttributeId(active)
    if (isDropAllowed) {
      return isDropAllowed(place, droppedAttrId)
    } else {
      return !!droppedAttrId
    }
  }

  const {parentElt, wrapperElt, setWrapperElt} = useAxisBoundsProvider(place, parentSelector)

  useAxis({
    axisModel, axisElt, titleRef, axisTitle: label, centerCategoryLabels
  })

  useDropHandler(droppableId, active => {
    const droppedAttrId = getDragAttributeId(active)
    droppedAttrId && isDropAllowed(place, droppedAttrId) && onDropAttribute?.(place, droppedAttrId)
  })

  const getSubAxes = () => {
    const numRepetitions = layout.getAxisMultiScale(place)?.repetitions ?? 1
    return range(numRepetitions).map(i => {
      return <SubAxis key={i}
                      numSubAxes={numRepetitions}
                      subAxisIndex={i}
                      getAxisModel={getAxisModel}
                      enableAnimation={enableAnimation}
                      showScatterPlotGridLines={showScatterPlotGridLines}
                      centerCategoryLabels={centerCategoryLabels}
      />
    })
  }

  return (
    <>
      <g className='axis-wrapper' ref={elt => setWrapperElt(elt)}>
        <g className='axis' ref={elt => setAxisElt(elt)} data-testid={`axis-${place}`}>
          {getSubAxes()}
        </g>
        <g ref={titleRef}/>
      </g>

      {parentElt && onDropAttribute && onTreatAttributeAs && onRemoveAttribute &&
        createPortal(<AxisOrLegendAttributeMenu
          target={titleRef.current}
          portal={parentElt}
          place={place}
          onChangeAttribute={onDropAttribute}
          onRemoveAttribute={onRemoveAttribute}
          onTreatAttributeAs={onTreatAttributeAs}
        />, parentElt)
      }

      {onDropAttribute &&
         <DroppableAxis
            place={`${place}`}
            dropId={droppableId}

            hintString={hintString}
            portal={parentElt}
            target={wrapperElt}
            onIsActive={handleIsActive}
         />}
    </>
  )
}
