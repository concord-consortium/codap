import React, {useCallback, useEffect, useRef, useState} from "react"
import {autorun} from "mobx"
import {drag, select} from "d3"
import {useAxisLayoutContext} from "../../axis/models/axis-layout-context"
import {ScaleNumericBaseType} from "../../axis/axis-types"
import {kGraphClassSelector} from "../graphing-types"
import {INumericAxisModel} from "../../axis/models/axis-model"
import {equationString, IAxisIntercepts, lineToAxisIntercepts} from "../utilities/graph-utils"
import {IMovableLineModel} from "./adornment-models"
import "./movable-line.scss"

export const MovableLine = (props: {
  model: IMovableLineModel
  xAxis: INumericAxisModel
  yAxis: INumericAxisModel
  transform: string
}) => {
  const {model, xAxis, yAxis, transform} = props,
    layout = useAxisLayoutContext(),
    xScale = layout.getAxisScale("bottom")?.scale as ScaleNumericBaseType,
    xRange = xScale.range(),
    yScale = layout.getAxisScale("left")?.scale as ScaleNumericBaseType,
    yRange = yScale.range(),
    kTolerance = 4, // pixels to snap to horizontal or vertical
    lineRef = useRef() as React.RefObject<SVGSVGElement>,
    [lineObject, setLineObject] = useState<{ [index: string]: any }>({
      line: null, lower: null, middle: null, upper: null, equation: null
    }),
    pointsOnAxes = useRef<IAxisIntercepts>()

  // Refresh the line
  useEffect(function refresh() {
      const disposer = autorun(() => {
        if (!lineObject.line) {
          return
        }
        const {slope, intercept} = model
        const {domain: xDomain} = xAxis
        const {domain: yDomain} = yAxis
        pointsOnAxes.current = lineToAxisIntercepts(slope, intercept, xDomain, yDomain)

        function fixEndPoints(iLine: any, index: number) {
          iLine
            .attr('transform', transform)
            .attr('x1', endPointsArray[index].pt1.x)
            .attr('y1', endPointsArray[index].pt1.y)
            .attr('x2', endPointsArray[index].pt2.x)
            .attr('y2', endPointsArray[index].pt2.y)
        }

        function refreshEquation() {
          if (!pointsOnAxes.current) return
          const
            screenX = xScale((pointsOnAxes.current.pt1.x + pointsOnAxes.current.pt2.x) / 2),
            screenY = yScale((pointsOnAxes.current.pt1.y + pointsOnAxes.current.pt2.y) / 2),
            string = equationString(slope, intercept)
          select('div.movable-line-equation-container')
            .style('left', `${screenX}px`)
            .style('top', `${screenY}px`)
            .html(string)
        }

        const
          pixelPtsOnAxes = {
            pt1: {
              x: xScale(pointsOnAxes.current.pt1.x),
              y: yScale(pointsOnAxes.current.pt1.y)
            },
            pt2: {
              x: xScale(pointsOnAxes.current.pt2.x),
              y: yScale(pointsOnAxes.current.pt2.y)
            }
          },
          breakPt1 = {
            x: pixelPtsOnAxes.pt1.x + (3 / 8) * (pixelPtsOnAxes.pt2.x - pixelPtsOnAxes.pt1.x),
            y: pixelPtsOnAxes.pt1.y + (3 / 8) * (pixelPtsOnAxes.pt2.y - pixelPtsOnAxes.pt1.y)
          },
          breakPt2 = {
            x: pixelPtsOnAxes.pt1.x + (5 / 8) * (pixelPtsOnAxes.pt2.x - pixelPtsOnAxes.pt1.x),
            y: pixelPtsOnAxes.pt1.y + (5 / 8) * (pixelPtsOnAxes.pt2.y - pixelPtsOnAxes.pt1.y)
          },
          endPointsArray = [
            {pt1: pixelPtsOnAxes.pt1, pt2: pixelPtsOnAxes.pt2},
            {pt1: pixelPtsOnAxes.pt1, pt2: breakPt1},
            {pt1: breakPt1, pt2: breakPt2},
            {pt1: breakPt2, pt2: pixelPtsOnAxes.pt2}
          ]
        fixEndPoints(lineObject.line, 0)
        fixEndPoints(lineObject.lower, 1)
        fixEndPoints(lineObject.middle, 2)
        fixEndPoints(lineObject.upper, 3)

        refreshEquation()
      })
      return () => disposer()
    }, [pointsOnAxes, lineObject, transform, xScale, yScale, model, xAxis, yAxis, xRange, yRange]
  )

  const
    continueTranslate = useCallback((event: MouseEvent) => {
      const tWorldX = xScale.invert(event.x - 60),
        tWorldY = yScale.invert(event.y)
      model.setLine({slope: model.slope, intercept: tWorldY - model.slope * tWorldX})
    }, [model, xScale, yScale]),

    continueRotation1 = useCallback((event: { x: number, y: number, dx: number, dy: number }) => {
      if (!pointsOnAxes.current) return
      if (event.dx !== 0 || event.dy !== 0) {
        let isVertical = false
        const newPivot1 = {x: xScale.invert(event.x - 60), y: yScale.invert(event.y)},
          pivot2 = model.pivot2.isValid() ? model.pivot2 : pointsOnAxes.current.pt2
        if (Math.abs(xScale(newPivot1.x) - xScale(pivot2.x)) < kTolerance) { // vertical
          newPivot1.x = pivot2.x
          isVertical = true
        } else if (Math.abs(yScale(newPivot1.y) - yScale(pivot2.y)) < kTolerance) { // horizontal
          newPivot1.y = pivot2.y
        }
        const newSlope = isVertical ? Number.POSITIVE_INFINITY : (pivot2.y - newPivot1.y) / (pivot2.x - newPivot1.x),
          newIntercept = isVertical ? pivot2.x : (newPivot1.y - newSlope * newPivot1.x)
        model.setLine({slope: newSlope, intercept: newIntercept, pivot1: newPivot1, pivot2})
      }
    }, [model, xScale, yScale]),

    continueRotation2 = useCallback((event: { x: number, y: number, dx: number, dy: number }) => {
      if (!pointsOnAxes.current) return
      if (event.dx !== 0 || event.dy !== 0) {
        let isVertical = false
        const newPivot2 = {x: xScale.invert(event.x - 60), y: yScale.invert(event.y)},
          pivot1 = model.pivot1.isValid() ? model.pivot1 : pointsOnAxes.current.pt1
        if (Math.abs(xScale(newPivot2.x) - xScale(pivot1.x)) < kTolerance) { // vertical
          newPivot2.x = pivot1.x
          isVertical = true
        } else if (Math.abs(yScale(newPivot2.y) - yScale(pivot1.y)) < kTolerance) {  // horizontal
          newPivot2.y = pivot1.y
        }
        const newSlope = isVertical ? Number.POSITIVE_INFINITY : (newPivot2.y - pivot1.y) / (newPivot2.x - pivot1.x),
          newIntercept = isVertical ? pivot1.x : (newPivot2.y - newSlope * newPivot2.x)
        model.setLine({slope: newSlope, intercept: newIntercept, pivot1, pivot2: newPivot2})
      }
    }, [model, xScale, yScale])

  // Add the behaviors to the line segments
  useEffect(function addBehaviors() {
    const behaviors: { [index: string]: any } = {
      lower: drag()
        .on("drag", continueRotation1),
      middle: drag()
        .on("drag", continueTranslate),
      upper: drag()
        .on("drag", continueRotation2)
    }
    lineObject.lower?.call(behaviors.lower)
    lineObject.middle?.call(behaviors.middle)
    lineObject.upper?.call(behaviors.upper)
  }, [lineObject, continueTranslate, continueRotation1, continueRotation2])

  // Make the line and its cover segments just once
  useEffect(function createElements() {
    const selection = select(lineRef.current),
      newLineObject: any = {}
    newLineObject.line = selection.append('line')
      .attr('class', 'movable-line')
    newLineObject.lower = selection.append('line')
      .attr('class', 'movable-line-cover movable-line-lower-cover')
    newLineObject.middle = selection.append('line')
      .attr('class', 'movable-line-cover movable-line-middle-cover')
    newLineObject.upper = selection.append('line')
      .attr('class', 'movable-line-cover movable-line-upper-cover')
    const equationDiv = select(kGraphClassSelector).append('div')
      .attr('class', 'movable-line-equation-container')
    newLineObject.equation = equationDiv
      .append('p')
      .attr('class', 'movable-line-equation')
    setLineObject(newLineObject)

    return () => {
      equationDiv.select('p')
        .transition()
        .duration(1000)
        .style('opacity', 0)
        .end().then(() => {
          equationDiv.remove()
        })
    }
  }, [])

  return (
    <g>
      <g ref={lineRef}/>
    </g>
  )
}
