import React, {useEffect, useRef} from "react"
import {axisBottom, axisLeft, drag, select} from "d3"
import {axisProps} from "./graphing-types"

const axisDragHints = ['Drag to change axis lower bound',
  'Drag to translate the axis',
  'Drag to change axis upper bound']

type D3Handler = (this: Element, event: any, d: any) => void

export const Axis = (props: { svgRef: React.RefObject<SVGSVGElement>, axisProps: axisProps }) => {
  const {axisProps: {scaleLinear: scale, orientation, label, counter, setCounter}} = props,
    axisRef = useRef(null),
    titleRef = useRef(null),
    [min, max] = scale?.range() || [0, 1]

  const axis = orientation === 'bottom' ? axisBottom : axisLeft

  useEffect(function refresh() {
    let scaleAtStart: any = null,
      lowerAtStart: number,
      upperAtStart: number,
      dilationAnchorCoord: number,
      dragging = false

    const onDragStart: D3Handler = () => {
        select(this as Element)
          .classed('dragging', true)
      },

      onDilateStart: D3Handler = (event: { x: number, y: number }) => {
        select(this)
          .classed('dragging', true)
        scaleAtStart = scale?.copy()
        lowerAtStart = scaleAtStart.domain()[0]
        upperAtStart = scaleAtStart.domain()[1]
        dilationAnchorCoord = Number(orientation === 'bottom' ? scale?.invert(event.x) : scale?.invert(event.y))
        dragging = true
      },

      onLowerDilateDrag = (event: { x: number, y: number, dx: number, dy: number }) => {
        const delta = -(orientation === 'bottom' ? event.dx : event.dy)
        if (dragging && delta !== 0) {
          setCounter(count => ++count)
          const
            x2 = orientation === 'bottom' ? scaleAtStart.invert(event.x) : scaleAtStart.invert(event.y),
            ratio = (upperAtStart - x2) / (upperAtStart - dilationAnchorCoord),
            newRange = (upperAtStart - lowerAtStart) / ratio,
            newLowerBound = upperAtStart - newRange
          scale?.domain([newLowerBound, upperAtStart])
        }
      },

      onDragTranslate = (event: { dx: number; dy: number }) => {
        const delta = -(orientation === 'bottom' ? event.dx : event.dy)
        if (delta !== 0) {
          const scaleDomain = scale?.domain() || [0, 1],
            worldDelta = Number(scale?.invert(delta)) - Number(scale?.invert(0))
          setCounter(count => ++count)
          scale?.domain([scaleDomain[0] + worldDelta, scaleDomain[1] + worldDelta])
        }
      },

      onUpperDilateDrag = (event: { x: number, y: number, dx: number, dy: number }) => {
        setCounter(count => ++count)
        const delta = (orientation === 'bottom' ? event.dx : event.dy)
        if (dragging && delta !== 0) {
          const
            x2 = orientation === 'bottom' ? scaleAtStart.invert(event.x) : scaleAtStart.invert(event.y),
            ratio = (x2 - lowerAtStart) / (dilationAnchorCoord - lowerAtStart),
            newRange = (upperAtStart - lowerAtStart) / ratio,
            newUpperBound = lowerAtStart + newRange
          scale?.domain([lowerAtStart, newUpperBound])
        }
      },

      onDragEnd = () => {
        select(this)
          .classed('dragging', false)
        scaleAtStart = null
        dragging = false
      }

    if (axisRef?.current) {
      const theAxis = select(axisRef.current)
        .attr("transform", props.axisProps.transform)
        // @ts-expect-error null => SVGSVGElement
        .call(axis(scale))

      // Add three rects in which the user can drag to dilate or translate the scale
      // Todo: When there's an axis model, it should be able to some of these distinctions internal to the model.
      const tLength = props.axisProps.length || 0,
        classPrefix = orientation === 'bottom' ? 'h' : 'v',
        numbering = orientation === 'bottom' ? [0, 1, 2] : [2, 1, 0],
        classPostfixes = orientation === 'bottom' ? ['lower-dilate', 'translate', 'upper-dilate'] :
          ['upper-dilate', 'translate', 'lower-dilate'],
        dragBehavior = [drag()  // lower
          .on("start", onDilateStart)
          .on("drag", onLowerDilateDrag)
          .on("end", onDragEnd),
          drag()  // middle
            .on("start", onDragStart)
            .on("drag", onDragTranslate)
            .on("end", onDragEnd),
          drag()  // upper
            .on("start", onDilateStart)
            .on("drag", onUpperDilateDrag)
            .on("end", onDragEnd)],
        // @ts-expect-error getBBox
        bbox = axisRef?.current?.getBBox?.()
      theAxis
        .selectAll('.dragRect')
        .data(numbering)// data signify lower, middle, upper rectangles
        .join(
          // @ts-expect-error void => Selection
          (enter) => {
            enter.append('rect')
              .attr('class', (d) => `dragRect ${classPrefix}-${classPostfixes[d]}`)
              .append('title')
              .text((d: number) => axisDragHints[numbering[d]])
          },
          (update) => {
            update
              .attr('x', (d) => bbox?.x + (orientation === 'bottom' ? (d * tLength / 3) : 0))
              .attr('y', (d) => bbox?.y + (orientation === 'bottom' ? 0 : (d * tLength / 3)))
              .attr('width', () => (orientation === 'bottom' ? tLength / 3 : bbox?.width))
              .attr('height', () => (orientation === 'bottom' ? bbox?.height : tLength / 3))
          }
        )
      numbering.forEach((behaviorIndex, axisIndex) => {
        theAxis.select(`.dragRect.${classPrefix}-${classPostfixes[axisIndex]}`).call(dragBehavior[behaviorIndex])
      })
      theAxis.selectAll('.dragRect').raise()
    }
  }, [props.axisProps.transform, axis, scale, min, max, counter, setCounter,
    props.axisProps.length, orientation])

  // Title
  useEffect(function setup() {
    const
      range = scale.range(),
      // @ts-expect-error getBBox
      bbox = axisRef?.current?.getBBox?.(),
      tX = (orientation === 'left') ? bbox?.x - 10 : Math.abs(range[0] - range[1]) / 2,
      tY = (orientation === 'bottom') ? bbox?.y + bbox?.height + 15 : Math.abs(range[0] - range[1]) / 2,
      // tY = orientation === 'bottom' ? bbox?.height + 15 : bbox?.x - 10,
      tRotation = orientation === 'bottom' ? '' : `rotate(-90,${tX},${tY})`
/*
    if(orientation==='left') {
      console.log(
        `tX = ${tX}; tY = ${tY}; bbox = x: ${bbox.x}, y: ${bbox.y}, width: ${bbox.width}, height: ${bbox.height}`)
    }
*/
    select(titleRef.current)
      .selectAll('text.axis-title')
      .data([1])
      .join(
        // @ts-expect-error void => Selection
        (enter) => {
          enter.append('text')
            .attr('class', 'axis-title')
            .attr('text-anchor', 'middle')
        },
        (update) => {
          update
            .attr('x', tX)
            .attr('y', tY)
            .attr('transform', props.axisProps.transform + ' ' + tRotation)
            .text(label || 'Unnamed')
        })

  }, [ label, scale, props.axisProps.transform, orientation, counter])

  return (
    <g>
      <g className='axis' ref={axisRef}/>
      <g ref={titleRef}/>
    </g>
  )
}
