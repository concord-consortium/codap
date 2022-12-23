import {Active} from "@dnd-kit/core"
import React, {MutableRefObject, useEffect, useRef, useState} from "react"
import {createPortal} from "react-dom"
import {select} from "d3"
import {useAxisLayoutContext} from "../models/axis-layout-context"
import {AxisPlace} from "../axis-types"
import {DroppableAxis} from "./droppable-axis"
import {axisPlaceToAttrRole, GraphPlace} from "../../graph/graphing-types"
import {useAxisBoundsProvider} from "../hooks/use-axis-bounds"
import {getDragAttributeId, useDropHandler} from "../../../hooks/use-drag-drop"
import {useDropHintString} from "../../../hooks/use-drop-hint-string"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {useAxis} from "../hooks/use-axis"
import {IAxisModel, INumericAxisModel} from "../models/axis-model"
import {AxisDragRects} from "./axis-drag-rects"
import {AxisOrLegendAttributeMenu} from "./axis-or-legend-attribute-menu"

import "./axis.scss"

interface IProps {
  parentSelector: string
  getAxisModel: () => IAxisModel | undefined
  label?: string
  enableAnimation: MutableRefObject<boolean>
  showScatterPlotGridLines?: boolean
  centerCategoryLabels?: boolean
  onDropAttribute?: (place: AxisPlace, attrId: string) => void
  onTreatAttributeAs?: (place: GraphPlace, attrId: string, treatAs: string) => void
}

const handleIsActive = (active: Active) => !!getDragAttributeId(active)

export const Axis = ({
                       parentSelector, label, getAxisModel, showScatterPlotGridLines = false,
                       centerCategoryLabels = true, onDropAttribute, enableAnimation, onTreatAttributeAs
                     }: IProps) => {
  const
    instanceId = useInstanceIdContext(),
    axisModel = getAxisModel(),
    place = axisModel?.place || 'bottom',
    droppableId = `${instanceId}-${place}-axis-drop`,
    layout = useAxisLayoutContext(),
    scale = layout.getAxisScale(place),
    hintString = useDropHintString({role: axisPlaceToAttrRole[place]}),
    [axisElt, setAxisElt] = useState<SVGGElement | null>(null),
    titleRef = useRef<SVGGElement | null>(null)

  const {parentElt, wrapperElt, setWrapperElt} = useAxisBoundsProvider(place, parentSelector)

  useAxis({
    axisModel, axisElt, label, enableAnimation, showScatterPlotGridLines, centerCategoryLabels,
    titleRef
  })

  useDropHandler(droppableId, active => {
    const droppedAttrId = getDragAttributeId(active)
    droppedAttrId && onDropAttribute?.(place, droppedAttrId)
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

      {parentElt && onDropAttribute && onTreatAttributeAs &&
        createPortal(<AxisOrLegendAttributeMenu
          target={titleRef.current}
          portal={parentElt}
          place={place}
          onChangeAttribute={onDropAttribute}
          onTreatAttributeAs={onTreatAttributeAs}
        />, parentElt)
      }

      {axisModel?.type === 'numeric' ?
        <AxisDragRects axisModel={axisModel as INumericAxisModel} axisWrapperElt={wrapperElt}/> : null}
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
