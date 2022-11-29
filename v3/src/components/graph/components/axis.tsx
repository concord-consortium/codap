import {Active} from "@dnd-kit/core"
import React, {useCallback, useEffect, useRef, useState} from "react"
import {createPortal} from "react-dom"
import {ScaleContinuousNumeric, scaleLinear, scaleOrdinal, select} from "d3"
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
import t from "../../../utilities/translation/translate"

import "./axis.scss"

interface IProps {
  getAxisModel: () => IAxisModel | undefined
  attributeID: string
  transform: string
  showGridLines: boolean
  insideSlider?: boolean
  onDropAttribute: (place: AxisPlace, attrId: string) => void
  onTreatAttributeAs: (place: GraphPlace, attrId: string, treatAs: string) => void
}

export const Axis = ({attributeID, getAxisModel, transform, showGridLines, insideSlider,
  onDropAttribute, onTreatAttributeAs}: IProps) => {

  const
    testInstanceId = useInstanceIdContext(),
    instanceId = testInstanceId ? testInstanceId : 'slider-1',
    dataset = useDataSetContext(),
    axisModel = getAxisModel(),
    place = axisModel?.place || 'bottom',
    label = dataset?.attrFromID(attributeID)?.name,
    droppableId = `${instanceId}-${place}-axis-drop`,
    layout = useGraphLayoutContext(),
    axisScale = insideSlider ? scaleLinear().domain([0,12]).range([0,600]) : layout.axisScale(place),
    hintString = useDropHintString({ role: axisPlaceToAttrRole[place] }),
    [axisElt, setAxisElt] = useState<SVGGElement | null>(null),
    titleRef = useRef<SVGGElement | null>(null)

  const {graphElt, wrapperElt, setWrapperElt} = useAxisBoundsProvider(place)

  console.log(axisScale?.range())
  useAxis({axisModel, axisElt, showGridLines, insideSlider, axisScale})

  // if (insideSlider && axisScale){
  //   console.log("SLIDER: ", {transform}, {axisElt}, {axisScale}, {axisModel}, {instanceId})
  // } else if (!insideSlider && axisScale) {
  //   console.log("BOTTOM: ", {transform}, {axisElt}, {axisScale}, {axisModel}, {instanceId})
  // }

  useEffect(function setupTransform() {
    axisElt && select(axisElt)
      .attr("transform", transform)
  }, [axisElt, transform])

  const handleIsActive = (active: Active) => !!getDragAttributeId(active)

  const handleDrop = useCallback((active: Active) => {
    const droppedAttrId = active.data?.current?.attributeId
    droppedAttrId && onDropAttribute?.(place, droppedAttrId)
  }, [place, onDropAttribute])

  const data: IDropData = {accepts: ["attribute"], onDrop: handleDrop}
  const [xMin, xMax] = axisScale?.range() || [0, 100]
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

  const axisWrapperClass = insideSlider ? 'axis-wrapper inside-slider' : 'axis-wrapper'
  const axisEltClass = insideSlider ? 'axis inside-slider' : 'axis'
  return (
    <>
      <g className={axisWrapperClass} ref={elt => setWrapperElt(elt)}>
        <g className={axisEltClass} ref={elt => setAxisElt(elt)} data-testid={`axis-${place}`}/>
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
