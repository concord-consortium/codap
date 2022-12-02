import {Active} from "@dnd-kit/core"
import React, {MutableRefObject, useCallback, useEffect, useRef, useState} from "react"
import {createPortal} from "react-dom"
import {scaleLinear, select} from "d3"
import {DroppableAxis} from "./droppable-axis"
import {useAxisBoundsProvider} from "../hooks/use-axis-bounds"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {getDragAttributeId, IDropData} from "../../../hooks/use-drag-drop"
import {useDropHintString} from "../../../hooks/use-drop-hint-string"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {useAxis} from "../hooks/use-axis"
import {AxisPlace, GraphPlace, axisPlaceToAttrRole, IAxisModel, INumericAxisModel} from "../models/axis-model"
import {useGraphLayoutContext} from "../models/graph-layout"
import {AxisDragRects} from "./axis-drag-rects"
import {AxisAttributeMenu} from "./axis-attribute-menu"
import { SliderModel } from "../../slider/slider-model"
import { GlobalValue, GlobalValuesStore } from "../../../models/data/global-value"

import t from "../../../utilities/translation/translate"


import "./axis.scss"

interface IProps {
  getAxisModel: () => IAxisModel | undefined
  attributeID: string
  transform: string
  enableAnimation?: MutableRefObject<boolean>
  showGridLines: boolean
  inGraph: boolean
  onDropAttribute: (place: AxisPlace, attrId: string) => void
  onTreatAttributeAs: (place: GraphPlace, attrId: string, treatAs: string) => void
}

export const Axis = ({attributeID, getAxisModel, transform, showGridLines, inGraph,
  onDropAttribute, enableAnimation, onTreatAttributeAs}: IProps) => {
  const
    idFromContext = useInstanceIdContext(),
    instanceId = inGraph ? idFromContext : 'slider-1',
    dataset = useDataSetContext(),
    axisModel = getAxisModel(),
    place = axisModel?.place || 'bottom',
    label = dataset?.attrFromID(attributeID)?.name,
    droppableId = `${instanceId}-${place}-axis-drop`,
    layout = useGraphLayoutContext(),
    scale = inGraph ? layout.axisScale(place) : scaleLinear().domain([0,12]).range([0,300]),
    hintString = useDropHintString({ role: axisPlaceToAttrRole[place] }),
    [axisElt, setAxisElt] = useState<SVGGElement | null>(null),
    titleRef = useRef<SVGGElement | null>(null)

  const {graphElt, wrapperElt, setWrapperElt} = useAxisBoundsProvider(place)

  useAxis({axisModel, axisElt, enableAnimation, showGridLines, scale})

  useEffect(function setupTransform() {
    axisElt && select(axisElt)
      .attr("transform", transform)
  }, [axisElt, transform])

  const handleIsActive = (active: Active) => !!getDragAttributeId(active)

  const handleDrop = useCallback((active: Active) => {
    const droppedAttrId = active.data?.current?.attributeId
    droppedAttrId && onDropAttribute(place, droppedAttrId)
  }, [place, onDropAttribute])

  const data: IDropData = {accepts: ["attribute"], onDrop: handleDrop}
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

  }, [axisElt, halfRange, label, place, transform])

  useEffect(function updateTitlePosition() {
    // track the bounds of the d3 axis element
    let observer: ResizeObserver
    if (axisElt) {
      observer = new ResizeObserver(() => {
        const
          d3AxisBounds = axisElt?.getBBox?.(),
          tX = (place === 'left') ? (d3AxisBounds?.x ?? 0) - 10 : halfRange,
          tY = (place === 'bottom') ? (d3AxisBounds?.y ?? 0) + (d3AxisBounds?.height ?? 30) + 15 : halfRange,
          tRotation = place === 'bottom' ? '' : `rotate(-90,${tX},${tY})`
        select(titleRef.current)
          .selectAll('text.axis-title')
          .data([1])
          .join(
            // @ts-expect-error void => Selection
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            (enter) => {
            },
            (update) => {
              update
                .attr('x', tX)
                .attr('y', tY)
                .attr('transform', transform + ' ' + tRotation)
                .text(label || t('DG.AxisView.emptyGraphCue'))
            })
      })
      observer.observe(axisElt)
    }

    return () => observer?.disconnect()
  }, [axisElt, place, halfRange, label, transform])

  return (
    <>
      <g className='axis-wrapper' ref={elt => setWrapperElt(elt)}>
        <g className='axis' ref={elt => setAxisElt(elt)} data-testid={`axis-${place}`}/>
        <g ref={titleRef}/>
      </g>

      { graphElt &&
        createPortal(<AxisAttributeMenu
          target={titleRef.current}
          portal={graphElt}
          place={place}
          onChangeAttribute={onDropAttribute}
          onTreatAttributeAs={onTreatAttributeAs}
        />, graphElt)
      }

      {axisModel?.type === 'numeric' ?
        <AxisDragRects axisModel={axisModel as INumericAxisModel} axisWrapperElt={wrapperElt}/> : null}
        <DroppableAxis
          place={`${place}`}
          dropId={droppableId}
          dropData={data}
          hintString={hintString}
          portal={graphElt}
          target={wrapperElt}
          onIsActive={handleIsActive}
        />
    </>
  )
}
