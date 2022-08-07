import React, {useCallback, useEffect, useRef, useState} from "react"
import {drag, ScaleLinear, select} from "d3"
import {CPLine, equationString, lineToAxisIntercepts} from "../graph-utils/graph_utils"
import "./movable-line.scss"


export const MovableLine = (props: {
  transform: string
  line: CPLine,
  setLine: React.Dispatch<React.SetStateAction<CPLine>>,
  xScale: ScaleLinear<number, number>,
  yScale: ScaleLinear<number, number>
}) => {
  const {
      setLine, xScale:x, yScale: y,
      line: {slope, intercept}
    } = props,
    kTolerance = 4, // pixels to snap to horizontal or vertical
    lineRef = useRef() as React.RefObject<SVGSVGElement>,
    xDomain = x.domain(),
    yDomain = y.domain(),
    pointsOnAxes = lineToAxisIntercepts(slope, intercept, xDomain, yDomain),
    [lineObject, setLineObject] = useState<{ [index: string]: any }>({
      line: null, lower: null, middle: null, upper: null, equation: null
    })
  // Refresh the line
  useEffect(function refresh() {
      if (!lineObject.line) {
        return
      }

      function fixEndPoints(iLine: any, index: number) {
        iLine
          .attr('transform', props.transform)
          .attr('x1', endPointsArray[index].pt1.x)
          .attr('y1', endPointsArray[index].pt1.y)
          .attr('x2', endPointsArray[index].pt2.x)
          .attr('y2', endPointsArray[index].pt2.y)
      }

      function refreshEquation() {
        const boundingRect = lineRef.current?.getBoundingClientRect(),
          screenX = x((pointsOnAxes.pt1.x + pointsOnAxes.pt2.x) / 2) + Number(boundingRect?.left),
          screenY = y((pointsOnAxes.pt1.y + pointsOnAxes.pt2.y) / 2) + Number(boundingRect?.top),
          string = equationString(slope, intercept)
        select('div.movable-line-equation-container')
          .style('left', `${screenX}px`)
          .style('top', `${screenY}px`)
          .html(string)
      }

      const
        pixelPtsOnAxes = {
          pt1: {
            x: x(pointsOnAxes.pt1.x),
            y: y(pointsOnAxes.pt1.y)
          },
          pt2: {
            x: x(pointsOnAxes.pt2.x),
            y: y(pointsOnAxes.pt2.y)
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
    }, [pointsOnAxes, lineObject, props.transform, slope, intercept, x, xDomain, y, yDomain]
  )

  const
    continueTranslate = useCallback((event: MouseEvent) => {
      const tWorldX = x.invert(event.x - 60),
        tWorldY = y.invert(event.y)
      setLine({slope, intercept: tWorldY - slope * tWorldX})
    }, [setLine, slope, x, y]),

    continueRotation1 = useCallback((event: { x: number, y: number, dx: number, dy: number }) => {
      if (event.dx !== 0 || event.dy !== 0) {
        let isVertical = false
        const newPivot1 = {x: x.invert(event.x - 60), y: y.invert(event.y)},
          pivot2 = props.line.pivot2 || pointsOnAxes.pt2
        if (Math.abs(x(newPivot1.x) - x(pivot2.x)) < kTolerance) { // vertical
          newPivot1.x = pivot2.x
          isVertical = true
        } else if (Math.abs(y(newPivot1.y) - y(pivot2.y)) < kTolerance) { // horizontal
          newPivot1.y = pivot2.y
        }
        const newSlope = isVertical ? Number.POSITIVE_INFINITY : (pivot2.y - newPivot1.y) / (pivot2.x - newPivot1.x),
          newIntercept = isVertical ? pivot2.x : (newPivot1.y - newSlope * newPivot1.x)
        setLine((prevLine) => {
          return {...prevLine, slope: newSlope, intercept: newIntercept, pivot1: newPivot1, pivot2}
        })
      }
    }, [setLine, props.line.pivot2, x, y, pointsOnAxes.pt2]),

    continueRotation2 = useCallback((event: { x: number, y: number, dx: number, dy: number }) => {
      if (event.dx !== 0 || event.dy !== 0) {
        let isVertical = false
        const newPivot2 = {x: x.invert(event.x - 60), y: y.invert(event.y)},
          pivot1 = props.line.pivot1 || pointsOnAxes.pt1
        if (Math.abs(x(newPivot2.x) - x(pivot1.x)) < kTolerance) { // vertical
          newPivot2.x = pivot1.x
          isVertical = true
        } else if (Math.abs(y(newPivot2.y) - y(pivot1.y)) < kTolerance) {  // horizontal
          newPivot2.y = pivot1.y
        }
        const newSlope = isVertical ? Number.POSITIVE_INFINITY : (newPivot2.y - pivot1.y) / (newPivot2.x - pivot1.x),
          newIntercept = isVertical ? pivot1.x : (newPivot2.y - newSlope * newPivot2.x)
        setLine((prevLine) => {
          return {...prevLine, slope: newSlope, intercept: newIntercept, pivot2: newPivot2, pivot1}
        })
      }
    }, [setLine, props.line.pivot1, x, y, pointsOnAxes.pt1])

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
  useEffect(function creatElements() {
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
    const equationDiv = select('.graph-plot').append('div')
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
      equationDiv.transition()
        .duration(1000)
        .remove()
    }
  }, [])

  return (
    <g>
      <g ref={lineRef}/>
    </g>
  )
}

