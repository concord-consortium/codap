import {observer} from "mobx-react-lite"
import React, {useEffect, useRef} from "react"
import {reaction} from "mobx"
import {drag, ScaleContinuousNumeric, select} from "d3"
import t from "../../../utilities/translation/translate"
import {useAxisLayoutContext} from "../models/axis-layout-context"
import {INumericAxisModel} from "../models/axis-model"
import {MultiScale} from "../models/multi-scale"
import {isVertical} from "../axis-types"

import "./axis.scss"

interface IProps {
  axisModel: INumericAxisModel
  axisWrapperElt: SVGGElement | null
  numSubAxes?: number
  subAxisIndex?: number
}

type D3Handler = (this: Element, event: any, d: any) => void

const axisDragHints = [t("DG.CellLinearAxisView.lowerPanelTooltip"),
  t("DG.CellLinearAxisView.midPanelTooltip"),
  t("DG.CellLinearAxisView.upperPanelTooltip")]

export const AxisDragRects = observer(
  function AxisDragRects({axisModel, axisWrapperElt, numSubAxes = 1, subAxisIndex = 0}: IProps) {
    const rectRef = useRef() as React.RefObject<SVGSVGElement>,
      place = axisModel.place,
      layout = useAxisLayoutContext()

    useEffect(function createRects() {
      let multiScale: MultiScale | undefined,
        d3Scale: ScaleContinuousNumeric<number, number>,
        d3ScaleAtStart: ScaleContinuousNumeric<number, number>,
        lower: number,
        upper: number,
        minDelta: number,
        dilationAnchorCoord: number,
        dragging = false

      const onDragStart: D3Handler = () => {
          const subAxisLength = layout.getAxisLength(place) / numSubAxes,
            rangeMin = subAxisIndex * subAxisLength,
            rangeMax = (subAxisIndex + 1) * subAxisLength,
            range = isVertical(place) ? [rangeMax, rangeMin] : [rangeMin, rangeMax]
          multiScale = layout.getAxisMultiScale(place)
          d3Scale = (multiScale?.scale as ScaleContinuousNumeric<number, number>).copy()
            .range(range)
          d3ScaleAtStart = d3Scale.copy()
          lower = d3ScaleAtStart.domain()[0]
          upper = d3ScaleAtStart.domain()[1]
          select(this as Element)
            .classed('dragging', true)
          axisModel.setTransitionDuration(0)
        },

        onDilateStart: D3Handler = (event: { x: number, y: number }) => {
          select(this)
            .classed('dragging', true)
          multiScale = layout.getAxisMultiScale(place)
          d3Scale = multiScale?.scale as ScaleContinuousNumeric<number, number>
          d3ScaleAtStart = d3Scale.copy()
          lower = d3ScaleAtStart.domain()[0]
          upper = d3ScaleAtStart.domain()[1]
          minDelta = (upper - lower) / 100  // During dilation, don't allow the axis to shrink by more than 1%
          dilationAnchorCoord = Number(place === 'bottom' ? d3Scale.invert(event.x)
            : d3Scale.invert(event.y))
          dragging = true
          axisModel.setTransitionDuration(0)
        },

        onLowerDilateDrag = (event: { x: number, y: number, dx: number, dy: number }) => {
          const delta = -(place === 'bottom' ? event.dx : event.dy)
          if (dragging && delta !== 0) {
            const
              rawX2 = place === 'bottom' ? d3ScaleAtStart.invert(event.x) : d3ScaleAtStart.invert(event.y),
              x2 = Math.min(rawX2, upper - minDelta),
              ratio = (upper - x2) / (upper - dilationAnchorCoord),
              newRange = (upper - lower) / ratio,
              newLowerBound = upper - newRange
            axisModel.setDomain(newLowerBound, upper)
          }
        },

        onDragTranslate = (event: { dx: number; dy: number }) => {
          const delta = -(place === 'bottom' ? event.dx : event.dy)
          if (delta !== 0) {
            const worldDelta = Number(d3Scale.invert(delta)) -
              Number(d3Scale.invert(0))
            lower += worldDelta
            upper += worldDelta
            axisModel.setDomain(lower, upper)
          }
        },

        onUpperDilateDrag = (event: { x: number, y: number, dx: number, dy: number }) => {
          const delta = (place === 'bottom' ? event.dx : event.dy)
          if (dragging && delta !== 0) {
            const
              rawX2 = place === 'bottom' ? d3ScaleAtStart.invert(event.x) : d3ScaleAtStart.invert(event.y),
              x2 = Math.max(rawX2, lower + minDelta),
              ratio = (x2 - lower) / (dilationAnchorCoord - lower),
              newRange = (upper - lower) / ratio,
              newUpperBound = lower + newRange
            axisModel.setDomain(lower, newUpperBound)
          }
        },

        onDragEnd = () => {
          select(this)
            .classed('dragging', false)
          dragging = false
        }

      if (rectRef.current) {
        const rectSelection = select(rectRef.current)

        // Add three rects in which the user can drag to dilate or translate the axis scale
        const
          classPrefix = place === 'bottom' ? 'h' : 'v',
          numbering = place === 'bottom' ? [0, 1, 2] : [2, 1, 0],
          classPostfixes = place === 'bottom'
            ? ['lower-dilate', 'translate', 'upper-dilate']
            : ['upper-dilate', 'translate', 'lower-dilate'],
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
              .on("end", onDragEnd)]
        rectSelection
          .selectAll('.dragRect')
          .data(numbering)// data signify lower, middle, upper rectangles
          .join(
            // @ts-expect-error void => Selection
            (enter) => {
              enter.append('rect')
                .attr('class', (d) => `dragRect ${classPrefix}-${classPostfixes[d]}`)
                .append('title')
                .text((d: number) => axisDragHints[numbering[d]])
            }
          )
        numbering.forEach((behaviorIndex, axisIndex) => {
          rectSelection.select(`.dragRect.${classPrefix}-${classPostfixes[axisIndex]}`)
            .call(dragBehavior[behaviorIndex])
        })
      }
    }, [axisModel, place, layout, numSubAxes, subAxisIndex])

    // update layout of axis drag rects when axis bounds change
    useEffect(() => {
      const disposer = reaction(
        () => {
          return layout.getComputedBounds(place)
        },
        (axisBounds) => {
          const
            length = layout.getAxisLength(place) / numSubAxes,
            start = subAxisIndex * length,
            rectSelection = select(rectRef.current),
            numbering = place === 'bottom' ? [0, 1, 2] : [2, 1, 0]
          if (length != null && axisBounds != null) {
            rectSelection
              .selectAll('.dragRect')
              .data(numbering)// data signify lower, middle, upper rectangles
              .join(
                // @ts-expect-error void => Selection
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                () => {
                },
                (update) => {
                  update
                    .attr('x', (d) => axisBounds.left + (place === 'bottom'
                      ? (start + d * length / 3) : 0))
                    .attr('y', (d) => axisBounds.top + (place === 'bottom'
                      ? 0 : (start + d * length / 3)))
                    .attr('width', () => (place === 'bottom' ? length / 3 : axisBounds.width))
                    .attr('height', () => (place === 'bottom' ? axisBounds.height : length / 3))
                }
              )
            rectSelection.selectAll('.dragRect').raise()
          }
        }, {fireImmediately: true}
      )
      return () => disposer()
    }, [axisModel, layout, axisWrapperElt, place, numSubAxes, subAxisIndex])
    return (
      <g className={'dragRect'} ref={rectRef}/>
    )
  })
