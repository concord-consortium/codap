import {Active} from "@dnd-kit/core"
import React, {useCallback, useEffect, useRef, useState} from "react"
import {select} from "d3"
import {DroppableAxis} from "./droppable-axis"
import {useAxisBoundsProvider} from "../hooks/use-axis-bounds"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {getDragAttributeId, IDropData} from "../../../hooks/use-drag-drop"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {useAxis} from "../hooks/use-axis"
import {AxisPlace, IAxisModel, INumericAxisModel} from "../models/axis-model"
import {ScaleNumericBaseType, useGraphLayoutContext} from "../models/graph-layout"
import {AxisDragRects} from "./axis-drag-rects"
import "./axis.scss"

interface IProps {
  attributeID: string,
  model: IAxisModel
  transform: string
  onDropAttribute: (place: AxisPlace, attrId: string) => void
}

export const Axis = ({attributeID, model, transform, onDropAttribute}: IProps) => {
  const
    instanceId = useInstanceIdContext(),
    dataset = useDataSetContext(),
    label = dataset?.attrFromID(attributeID)?.name,
    droppableId = `${instanceId}-${model.place}-axis`,
    layout = useGraphLayoutContext(),
    scale = layout.axisScale(model.place),
    [axisElt, setAxisElt] = useState<SVGGElement | null>(null),
    titleRef = useRef<SVGGElement | null>(null),
    place = model.place

  const {graphElt, wrapperElt, setWrapperElt} = useAxisBoundsProvider(model.place)

  useAxis({axisModel: model, axisElt})

  useEffect(function setupTransform() {
      axisElt && select(axisElt)
        .attr("transform", transform)
    }, [axisElt, transform])

  const handleIsActive = (active: Active) => !!getDragAttributeId(active)

  const handleDrop = useCallback((active: Active) => {
    const droppedAttrId = active.data?.current?.attributeId
    droppedAttrId && onDropAttribute(model.place, droppedAttrId)
  }, [model.place, onDropAttribute])

  const data: IDropData = {accepts: ["attribute"], onDrop: handleDrop}

  const [xMin, xMax] = (scale as ScaleNumericBaseType).range()
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
                .text(label || 'Unnamed')
            })
      })
      observer.observe(axisElt)
    }

    return () => observer?.disconnect()
  }, [axisElt, place, halfRange, label, transform])

  return (
    <>
      <g className='axis-wrapper' ref={elt => setWrapperElt(elt)}>
        <g className='axis' ref={elt => setAxisElt(elt)}/>
        <g ref={titleRef}/>
      </g>
      <AxisDragRects axisModel={model as INumericAxisModel} axisWrapperElt={wrapperElt}/>
      <DroppableAxis place={`${model.place}`} dropId={droppableId} dropData={data}
                     portal={graphElt} target={wrapperElt} onIsActive={handleIsActive}/>
    </>
  )
}
