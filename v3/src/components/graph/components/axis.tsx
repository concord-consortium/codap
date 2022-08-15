import React, {useEffect, useRef} from "react"
import {axisBottom, axisLeft, drag, select} from "d3"
import {AxisProps} from "../graphing-types"
import {useNumericAxis} from "../hooks/use-numeric-axis"
import { useGraphLayoutContext } from "../models/graph-layout"
import { prf } from "../../../utilities/profiler"
import "./axis.scss"

const axisDragHints = ['Drag to change axis lower bound',
  'Drag to translate the axis',
  'Drag to change axis upper bound']

type D3Handler = (this: Element, event: any, d: any) => void

export const Axis = (props: { svgRef: React.RefObject<SVGSVGElement>, axisProps: AxisProps }) => {
  const {axisProps: {model, transform, label}} = props,
    layout = useGraphLayoutContext(),
    scale = layout.axisScale(model.place),
    length = layout.axisLength(model.place),
    axisRef = useRef<SVGGElement | null>(null),
    titleRef = useRef<SVGGElement | null>(null),
    orientation = model.place

  const axis = orientation === 'bottom' ? axisBottom : axisLeft

  useNumericAxis({ axisModel: model, axisElt: axisRef.current })

  useEffect(function createAndRefresh() {
    let scaleAtStart: any = null,
      lowerAtStart: number,
      upperAtStart: number,
      dilationAnchorCoord: number,
      dragging = false

    const onDragStart: D3Handler = () => {
        prf.measure("Graph.Axis[onDragStart]", () => {
          select(this as Element)
            .classed('dragging', true)
        })
      },

      onDilateStart: D3Handler = (event: { x: number, y: number }) => {
        prf.measure("Graph.Axis[onDilateStart]", () => {
          select(this)
            .classed('dragging', true)
          scaleAtStart = scale?.copy()
          lowerAtStart = scaleAtStart.domain()[0]
          upperAtStart = scaleAtStart.domain()[1]
          dilationAnchorCoord = Number(orientation === 'bottom' ? scale?.invert(event.x) : scale?.invert(event.y))
          dragging = true
        })
      },

      onLowerDilateDrag = (event: { x: number, y: number, dx: number, dy: number }) => {
        prf.measure("Graph.Axis[onLowerDilateDrag]", () => {
          const delta = -(orientation === 'bottom' ? event.dx : event.dy)
          if (dragging && delta !== 0) {
            const
              x2 = orientation === 'bottom' ? scaleAtStart.invert(event.x) : scaleAtStart.invert(event.y),
              ratio = (upperAtStart - x2) / (upperAtStart - dilationAnchorCoord),
              newRange = (upperAtStart - lowerAtStart) / ratio,
              newLowerBound = upperAtStart - newRange
            model.setDomain(newLowerBound, upperAtStart)
          }
        })
      },

      onDragTranslate = (event: { dx: number; dy: number }) => {
        prf.measure("Graph.Axis[onDragTranslate]", () => {
          const delta = -(orientation === 'bottom' ? event.dx : event.dy)
          if (delta !== 0) {
            const worldDelta = Number(scale?.invert(delta)) - Number(scale?.invert(0))
            model.setDomain(model.min + worldDelta, model.max + worldDelta)
          }
        })
      },

      onUpperDilateDrag = (event: { x: number, y: number, dx: number, dy: number }) => {
        prf.measure("Graph.Axis[onUpperDilateDrag]", () => {
          const delta = (orientation === 'bottom' ? event.dx : event.dy)
          if (dragging && delta !== 0) {
            const
              x2 = orientation === 'bottom' ? scaleAtStart.invert(event.x) : scaleAtStart.invert(event.y),
              ratio = (x2 - lowerAtStart) / (dilationAnchorCoord - lowerAtStart),
              newRange = (upperAtStart - lowerAtStart) / ratio,
              newUpperBound = lowerAtStart + newRange
            model.setDomain(lowerAtStart, newUpperBound)
          }
        })
      },

      onDragEnd = () => {
        prf.measure("Graph.Axis[onUpperDilateDrag]", () => {
          select(this)
            .classed('dragging', false)
          scaleAtStart = null
          dragging = false
        })
      }

    prf.measure("Graph.Axis[createAndRefresh]", () => {
      if (axisRef?.current) {
        const axisSelection = select(axisRef.current)
          .attr("transform", transform)

        // Add three rects in which the user can drag to dilate or translate the scale
        // Todo: When there's an axis model, it should be able to some of these distinctions internal to the model.
        const tLength = length || 0,
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
          bbox = axisRef?.current?.getBBox?.()
        axisSelection
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
          axisSelection.select(`.dragRect.${classPrefix}-${classPostfixes[axisIndex]}`)
            .call(dragBehavior[behaviorIndex])
        })
        axisSelection.selectAll('.dragRect').raise()
      }
    })
  }, [model, transform, axis, scale, orientation, length])

  const [xMin, xMax] = scale.range()
  const halfRange = Math.abs(xMax - xMin) / 2
  useEffect(function setupTitle() {
    const
      bbox = axisRef?.current?.getBBox?.(),
      tX = (orientation === 'left') ? (bbox?.x ?? 0) - 10 : halfRange,
      tY = (orientation === 'bottom') ? (bbox?.y ?? 0) + (bbox?.height ?? 30) + 15 : halfRange,
      // tY = orientation === 'bottom' ? bbox?.height + 15 : bbox?.x - 10,
      tRotation = orientation === 'bottom' ? '' : `rotate(-90,${tX},${tY})`
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
            .attr('transform', transform + ' ' + tRotation)
            .text(label || 'Unnamed')
        })

  }, [halfRange, label, orientation, transform])

  return (
    <g>
      <g className='axis' ref={axisRef}/>
      <g ref={titleRef}/>
    </g>
  )
}
