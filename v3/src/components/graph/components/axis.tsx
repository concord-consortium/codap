import {Active} from "@dnd-kit/core"
import React, {MutableRefObject, useEffect, useRef, useState} from "react"
import {createPortal} from "react-dom"
import {select, scaleLinear} from "d3"
import {DroppableAxis} from "./droppable-axis"
import {useAxisBoundsProvider} from "../hooks/use-axis-bounds"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {getDragAttributeId, useDropHandler} from "../../../hooks/use-drag-drop"
import {useDropHintString} from "../../../hooks/use-drop-hint-string"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {useAxis} from "../hooks/use-axis"
import {AxisPlace, GraphPlace, axisPlaceToAttrRole, IAxisModel, INumericAxisModel} from "../models/axis-model"
import {AxisDragRects} from "./axis-drag-rects"
import {AxisAttributeMenu} from "./axis-attribute-menu"

import "./axis.scss"

interface IProps {
  getAxisModel: () => IAxisModel | undefined
  attributeID: string
  enableAnimation: MutableRefObject<boolean>
  showGridLines: boolean
  scale: any
  onDropAttribute: (place: AxisPlace, attrId: string) => void
  onTreatAttributeAs: (place: GraphPlace, attrId: string, treatAs: string) => void
}

export const Axis = ({
                       attributeID, getAxisModel, showGridLines, scale,
                       onDropAttribute, enableAnimation, onTreatAttributeAs
                     }: IProps) => {
  const
    idFromContext = useInstanceIdContext(),
    inGraph = idFromContext?.includes('graph'), // TODO - refactor - at this point, I still need this flag for use-axis and drag-rects
    instanceId = inGraph ? idFromContext : 'slider-1',
    dataset = useDataSetContext(),
    axisModel = getAxisModel(),
    place = axisModel?.place || 'bottom',
    label = dataset?.attrFromID(attributeID)?.name,
    droppableId = `${instanceId}-${place}-axis-drop`,
    hintString = useDropHintString({role: axisPlaceToAttrRole[place]}),
    [axisElt, setAxisElt] = useState<SVGGElement | null>(null),
    titleRef = useRef<SVGGElement | null>(null)

  const {graphElt, wrapperElt, setWrapperElt} = useAxisBoundsProvider(place)

  useAxis({
    axisModel, axisElt, label, enableAnimation, showGridLines,
    titleRef, scale, inGraph
  })

  const handleIsActive = (active: Active) => !!getDragAttributeId(active)

  useDropHandler(droppableId, active => {
    const droppedAttrId = getDragAttributeId(active)
    droppedAttrId && onDropAttribute(place, droppedAttrId)
  })

  const [xMin, xMax] = scale?.range() || [0, 100]
  const halfRange = Math.abs(xMax - xMin) / 2
  useEffect(function setupTitle() {
    select(titleRef.current)
      .selectAll('text.axis-title')
      .data([1])
      .join(
        // @ts-expect-error void => Selection
        (enter) => {
          enter.append('text')
            .attr('class', 'axis-title')
            .attr('text-anchor', 'middle')
            .attr('data-testid', `axis-title-${place}`)
        })

  }, [axisElt, halfRange, label, place])

  return (
    <>
      <g className='axis-wrapper' ref={elt => setWrapperElt(elt)}>
        <g className='axis' ref={elt => setAxisElt(elt)} data-testid={`axis-${place}`}/>
        <g ref={titleRef}/>
      </g>

      {graphElt &&
        createPortal(<AxisAttributeMenu
          target={titleRef.current}
          portal={graphElt}
          place={place}
          onChangeAttribute={onDropAttribute}
          onTreatAttributeAs={onTreatAttributeAs}
        />, graphElt)
      }

      {axisModel?.type === 'numeric' ?
        <AxisDragRects
          axisModel={axisModel as INumericAxisModel}
          axisWrapperElt={wrapperElt}
          inGraph={inGraph}
          scale={scale}
          boundsRect={wrapperElt?.getBoundingClientRect()} //TODO - you still need to account for component as origin - relative to component
        /> : null}

      <DroppableAxis
        place={`${place}`}
        dropId={droppableId}
        hintString={hintString}
        portal={graphElt}
        target={wrapperElt}
        onIsActive={handleIsActive}
      />
    </>
  )
}
