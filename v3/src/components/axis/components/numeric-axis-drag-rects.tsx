import {observer} from "mobx-react-lite"
import React, {useEffect, useRef} from "react"
import { comparer, reaction } from "mobx"
import { drag, DragBehavior, ScaleContinuousNumeric, select, SubjectPosition } from "d3"
import { logMessageWithReplacement } from "../../../lib/log-message"
import { getTileModel } from "../../../models/tiles/tile-model"
import { t } from "../../../utilities/translation/translate"
import {isVertical} from "../../axis-graph-shared"
import { useDataDisplayModelContextMaybe } from "../../data-display/hooks/use-data-display-model"
import {RectIndices, selectDragRects} from "../axis-types"
import {useAxisLayoutContext} from "../models/axis-layout-context"
import { updateAxisNotification } from "../models/axis-notifications"
import {MultiScale} from "../models/multi-scale"
import { IBaseNumericAxisModel } from "../models/numeric-axis-models"

import "./axis.scss"

interface IProps {
  axisModel: IBaseNumericAxisModel
  axisWrapperElt: SVGGElement | null
  numSubAxes?: number
  subAxisIndex?: number
}

type D3Handler = (this: Element, event: any, d: any) => void

const axisDragHints = [t("DG.CellLinearAxisView.lowerPanelTooltip"),
  t("DG.CellLinearAxisView.midPanelTooltip"),
  t("DG.CellLinearAxisView.upperPanelTooltip")]

export const NumericAxisDragRects = observer(
  function NumericAxisDragRects({axisModel, axisWrapperElt, numSubAxes = 1, subAxisIndex = 0}: IProps) {
    const rectRef = useRef() as React.RefObject<SVGGElement>,
      { lockZero, place } = axisModel,
      layout = useAxisLayoutContext(),
      displayModel = useDataDisplayModelContextMaybe()

    useEffect(function createRects() {
      const rectElement = rectRef.current // Copy the ref value to a local variable
      let multiScale: MultiScale | undefined,
        d3Scale: ScaleContinuousNumeric<number, number>,
        d3ScaleAtStart: ScaleContinuousNumeric<number, number>,
        lower: number,
        upper: number,
        minDelta: number,
        dilationAnchorCoord: number,
        dragging = false,
        dilating = false

      const dragBehaviors: Array<DragBehavior<SVGRectElement, RectIndices, SubjectPosition | RectIndices>> = []

      const onDragStart: D3Handler = function() {
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
          select(this)
            .classed('dragging', true)
          axisModel.setTransitionDuration(0)
        },

        onDilateStart: D3Handler = function(event: { x: number, y: number }) {
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
          dilating = true
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
            axisModel.setDynamicDomain(newLowerBound, upper)
          }
        },

        onDragTranslate = (event: { dx: number; dy: number }) => {
          const delta = -(place === 'bottom' ? event.dx : event.dy)
          if (delta !== 0) {
            const worldDelta = Number(d3Scale.invert(delta)) -
              Number(d3Scale.invert(0))
            lower += worldDelta
            upper += worldDelta
            axisModel.setDynamicDomain(lower, upper)
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
            axisModel.setDynamicDomain(lower, newUpperBound)
          }
        },

        onDragEnd: D3Handler = function() {
          select(this)
            .classed('dragging', false)
          const tileModel = displayModel && getTileModel(displayModel)
          // move "dynamic" values to model on drop
          axisModel.applyModelChange(
            () => axisModel.setDomain(...axisModel.domain), {
              notify: tileModel
                ? updateAxisNotification("change axis bounds", axisModel.domain, tileModel)
                : undefined,
              undoStringKey: dilating ? "DG.Undo.axisDilate" : "DG.Undo.axisDrag",
              redoStringKey: dilating ? "DG.Redo.axisDilate" : "DG.Redo.axisDrag",
              log: logMessageWithReplacement("Axis domain change: lower: %@, upper: %@",
                      {lower: axisModel.domain[0], upper: axisModel.domain[1]}, "plot")
            })
          dragging = false
          dilating = false
        }

      if (rectElement) {
        // Add rects which the user can drag to dilate or translate the axis scale. If the data display
        // model has a fixed zero axis, only add one draggable rect. Otherwise, add three.
        const classPrefix = place === 'bottom' ? 'h' : 'v',
          numbering: RectIndices = lockZero
                ? [0]
                : place === 'bottom' ? [0, 1, 2] : [2, 1, 0],
          classPostfixes = lockZero
                             ? ['upper-dilate']
                             : place === 'bottom'
                               ? ['lower-dilate', 'translate', 'upper-dilate']
                               : ['upper-dilate', 'translate', 'lower-dilate'],
          dragBehavior = [
            drag<SVGRectElement, RectIndices>()  // lower
            .on("start", onDilateStart)
            .on("drag", onLowerDilateDrag)
            .on("end", onDragEnd),
            drag<SVGRectElement, RectIndices>()  // middle
              .on("start", onDragStart)
              .on("drag", onDragTranslate)
              .on("end", onDragEnd),
            drag<SVGRectElement, RectIndices>()  // upper
              .on("start", onDilateStart)
              .on("drag", onUpperDilateDrag)
              .on("end", onDragEnd)]

        dragBehaviors.push(...dragBehavior)

        selectDragRects(rectElement)
          ?.data(numbering)// data signify lower, middle, upper rectangles
          .join(
            (enter) =>
              enter.append('rect')
                .attr('class', (d) => d !== undefined && `dragRect ${classPrefix}-${classPostfixes?.[d] ?? ''}`)
                .append('title')
                .text((d?: number) => {
                  if (d === undefined) return ''
                  const hintIndex = d >= 0 && d < numbering.length ? numbering[d] : undefined
                  if (hintIndex === undefined || axisDragHints[hintIndex] === undefined) {
                    return ''
                  }
                  return axisDragHints[hintIndex]
                })
          )
        numbering.forEach((behaviorIndex, axisIndex) => {
          const indexedRects = selectDragRects(rectElement, `.${classPrefix}-${classPostfixes[axisIndex]}`)
          if (lockZero) {
            indexedRects?.call(
              drag<any, any>()
                .on("start", onDilateStart)
                .on("drag", onUpperDilateDrag)
                .on("end", onDragEnd))
          } else {
            if (behaviorIndex === undefined) return
            indexedRects?.call(dragBehavior[behaviorIndex])
          }
        })
      }

      return () => {
        // Cleanup drag behaviors
        if (rectElement) {
          selectDragRects(rectElement)?.on(".drag", null)
          selectDragRects(rectElement)?.remove()
        }
        dragBehaviors.forEach((behavior) => behavior.on("start", null).on("drag", null).on("end", null))
      }
    }, [axisModel, place, layout, numSubAxes, subAxisIndex, lockZero, displayModel])

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
            numbering = lockZero
                          ? [0]
                          : place === 'bottom' ? [0, 1, 2] : [2, 1, 0],
            rectCount = lockZero ? 1 : 3
          if (length != null && length > 0 && axisBounds != null) {
            selectDragRects(rectRef.current)
              ?.data(numbering)// data signify lower, middle, upper rectangles
              .join(
                enter => enter,
                (update) =>
                  update
                    .attr('x', (d) => axisBounds.left + (place === 'bottom'
                      ? (start + d * length / rectCount) : 0))
                    .attr('y', (d) => axisBounds.top + (place === 'bottom'
                      ? 0 : (start + d * length / rectCount)))
                    .attr('width', () => (place === 'bottom' ? length / rectCount : axisBounds.width))
                    .attr('height', () => (place === 'bottom' ? axisBounds.height : length / rectCount))
              )
            selectDragRects(rectRef.current)?.raise()
          }
        }, {equals: comparer.structural, name: "NumericAxisDragRects [axisBounds]", fireImmediately: true}
      )
      return () => disposer()
    }, [axisModel, layout, axisWrapperElt, place, numSubAxes, subAxisIndex, lockZero])
    return (
      <g className={'dragRectWrapper'} ref={rectRef}/>
    )
  })
