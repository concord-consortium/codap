import React, {useCallback, useEffect, useRef, useState} from "react"
import {autorun} from "mobx"
import {drag, select} from "d3"
import {useAxisLayoutContext} from "../../axis/models/axis-layout-context"
import {ScaleNumericBaseType} from "../../axis/axis-types"
import {kGraphAdornmentsClassSelector} from "../graphing-types"
import {INumericAxisModel} from "../../axis/models/axis-model"
import {equationString, IAxisIntercepts, lineToAxisIntercepts} from "../utilities/graph-utils"
import {IMovableLineModel} from "./adornment-models"
import { useDataConfigurationContext } from "../hooks/use-data-configuration-context"
import "./movable-line.scss"

export const MovableLine = (props: {
  lineKey?: string
  model: IMovableLineModel
  plotHeight: number
  plotIndex: number
  plotWidth: number
  transform?: string
  xAxis: INumericAxisModel
  yAxis: INumericAxisModel
}) => {
  const {lineKey='', model, plotHeight, plotIndex, plotWidth, transform, xAxis, yAxis} = props,
    data = useDataConfigurationContext(),
    layout = useAxisLayoutContext(),
    xScale = layout.getAxisScale("bottom") as ScaleNumericBaseType,
    xRange = xScale.range(),
    yScale = layout.getAxisScale("left") as ScaleNumericBaseType,
    yRange = yScale.range(),
    kTolerance = 4, // pixels to snap to horizontal or vertical
    kHandleSize = 12,
    lineRef = useRef() as React.RefObject<SVGSVGElement>,
    [lineObject, setLineObject] = useState<{ [index: string]: any }>({
      line: null, lower: null, middle: null, upper: null, equation: null
    }),
    pointsOnAxes = useRef<IAxisIntercepts>()

  // get attributes for use in equation
  const allAttributes = data?.dataset?.attributes,
    xAttrId = data?.attributeID('x') || '',
    yAttrId = data?.attributeID('y') || '',
    xAttr = allAttributes?.find(attr => attr.id === xAttrId),
    yAttr = allAttributes?.find(attr => attr.id === yAttrId),
    xAttrName = xAttr?.name ?? '',
    yAttrName = yAttr?.name ?? '',
    xSubAxesCount = layout.getAxisMultiScale('bottom')?.repetitions ?? 1,
    ySubAxesCount = layout.getAxisMultiScale('left')?.repetitions ?? 1

  const setClassNameFromKey = (key: string) => {
    const className = key.replace(/\{/g, '')
      .replace(/\}/g, '')
      .replace(/: /g, '-')
      .replace(/, /g, '-')
    return className
  }

  // add lines that don't already exist in the model
  useEffect(function addLine() {
    if (!model.lines.has(lineKey)) {
      // TODO: Determine how to calculate the correct slope and intercept values
      // when initializing the line. The current values are just placeholders.
      const intercept = 0
      const slope = 45
      model.setLine({slope, intercept}, lineKey)
    }
  }, [model, lineKey])

  // Refresh the line
  useEffect(function refresh() {
      const disposer = autorun(() => {
        const lineModel = model.lines.get(lineKey)
        if (!lineObject.line || !lineModel) {
          return
        }
        const { slope, intercept } = lineModel
        const {domain: xDomain} = xAxis
        const {domain: yDomain} = yAxis
        pointsOnAxes.current = lineToAxisIntercepts(slope, intercept, xDomain, yDomain)

        function fixEndPoints(iLine: any, index: number) {
          iLine
            .attr('x1', endPointsArray[index].pt1.x)
            .attr('y1', endPointsArray[index].pt1.y)
            .attr('x2', endPointsArray[index].pt2.x)
            .attr('y2', endPointsArray[index].pt2.y)
        }

        function fixHandles(iRect: any, index: number) {
          const xCenter = (endPointsArray[index].pt1.x + endPointsArray[index].pt2.x) / 2,
            yCenter = (endPointsArray[index].pt1.y + endPointsArray[index].pt2.y) / 2
          iRect
            .attr('x', xCenter - kHandleSize / 2)
            .attr('y', yCenter - kHandleSize / 2)
        }

        function refreshEquation() {
          if (!pointsOnAxes.current) return
          const
            screenX = xScale((pointsOnAxes.current.pt1.x + pointsOnAxes.current.pt2.x) / 2) / xSubAxesCount,
            screenY = yScale((pointsOnAxes.current.pt1.y + pointsOnAxes.current.pt2.y) / 2) / ySubAxesCount,
            attrNames = {x: xAttrName, y: yAttrName},
            string = equationString(slope, intercept, attrNames),
            lineContainerClass =
              `div.movable-line-equation-container${lineKey && lineKey !== '' ? `-${setClassNameFromKey(lineKey)}` : ''}`
          select(lineContainerClass)
            .style('width', `${plotWidth}px`)
            .style('height', `${plotHeight}px`)
          select(`${lineContainerClass} p`)
            .style('left', `${screenX}px`)
            .style('top', `${screenY}px`)
            .html(string)
        }

        const
          // The coordinates at which the line intersects the axes
          pixelPtsOnAxes = {
            pt1: {
              x: xScale(pointsOnAxes.current.pt1.x) / xSubAxesCount,
              y: yScale(pointsOnAxes.current.pt1.y) / ySubAxesCount
            },
            pt2: {
              x: xScale(pointsOnAxes.current.pt2.x) / xSubAxesCount,
              y: yScale(pointsOnAxes.current.pt2.y) / ySubAxesCount
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
        fixHandles(lineObject.handleLower, 1)
        fixHandles(lineObject.handleMiddle, 2)
        fixHandles(lineObject.handleUpper, 3)
        refreshEquation()
      })
      return () => disposer()
    }, [pointsOnAxes, lineKey, lineObject, plotHeight, plotWidth, transform, 
        xScale, yScale, model, xAttrName, xSubAxesCount, xAxis, yAttrName, 
        ySubAxesCount, yAxis, xRange, yRange]
  )

  const
    // Middle cover drag handler
    continueTranslate = useCallback((event: MouseEvent) => {
      const slope = model.lines?.get(lineKey)?.slope || 45
      const tWorldX = xScale.invert(event.x) / ySubAxesCount,
        tWorldY = yScale.invert(event.y) / ySubAxesCount
      model.setLine({slope, intercept: tWorldY - slope * tWorldX}, lineKey)
    }, [lineKey, model, xScale, yScale]),

    // Lower cover drag handler
    continueRotation1 = useCallback((event: { x: number, y: number, dx: number, dy: number }) => {
      if (!pointsOnAxes.current) return
      const currentPivot2 = model.lines?.get(lineKey)?.pivot2
      if (event.dx !== 0 || event.dy !== 0) {
        let isVertical = false
        const newPivot1 = {x: xScale.invert(event.x) / ySubAxesCount, y: yScale.invert(event.y) / xSubAxesCount},
          pivot2 = currentPivot2?.isValid() ? currentPivot2 : pointsOnAxes.current.pt2
        if (Math.abs(xScale(newPivot1.x) - xScale(pivot2.x)) < kTolerance) { // vertical
          newPivot1.x = pivot2.x / ySubAxesCount
          isVertical = true
        } else if (Math.abs(yScale(newPivot1.y) - yScale(pivot2.y)) < kTolerance) { // horizontal
          newPivot1.y = pivot2.y / xSubAxesCount
        }
        const newSlope = isVertical ? Number.POSITIVE_INFINITY : (pivot2.y / xSubAxesCount - newPivot1.y) / (pivot2.x / ySubAxesCount - newPivot1.x),
          newIntercept = isVertical ? pivot2.x : (newPivot1.y - newSlope * newPivot1.x)
        model.setLine({slope: newSlope, intercept: newIntercept, pivot1: newPivot1, pivot2}, lineKey)
      }
    }, [lineKey, model, xScale, yScale]),

    // Upper cover drag handler
    continueRotation2 = useCallback((event: { x: number, y: number, dx: number, dy: number }) => {
      if (!pointsOnAxes.current) return
      const currentPivot1 = model.lines?.get(lineKey)?.pivot1
      if (event.dx !== 0 || event.dy !== 0) {
        let isVertical = false
        const newPivot2 = {x: xScale.invert(event.x) / ySubAxesCount, y: yScale.invert(event.y) / xSubAxesCount},
          pivot1 = currentPivot1?.isValid() ? currentPivot1 : pointsOnAxes.current.pt1
        if (Math.abs(xScale(newPivot2.x) - xScale(pivot1.x)) < kTolerance) { // vertical
          newPivot2.x = pivot1.x / ySubAxesCount
          isVertical = true
        } else if (Math.abs(yScale(newPivot2.y) - yScale(pivot1.y)) < kTolerance) {  // horizontal
          newPivot2.y = pivot1.y / xSubAxesCount
        }
        const newSlope = isVertical ? Number.POSITIVE_INFINITY : (newPivot2.y / xSubAxesCount - pivot1.y) / (newPivot2.x / ySubAxesCount - pivot1.x),
          newIntercept = isVertical ? pivot1.x : (newPivot2.y - newSlope * newPivot2.x)
        model.setLine({slope: newSlope, intercept: newIntercept, pivot1, pivot2: newPivot2}, lineKey)
      }
    }, [lineKey, model, xScale, yScale])

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

  // Build the line and its cover segments and handles just once
  useEffect(function createElements() {
    const selection = select(lineRef.current),
      newLineObject: any = {}

    selection.style('opacity', 0)
      .transition()
      .duration(1000)
      .style('opacity', 1)

    // Set up the line and its cover segments and handles
    newLineObject.line = selection.append('line')
      .attr('class', 'movable-line')
    newLineObject.lower = selection.append('line')
      .attr('class', 'movable-line-cover movable-line-lower-cover')
    newLineObject.middle = selection.append('line')
      .attr('class', 'movable-line-cover movable-line-middle-cover')
    newLineObject.upper = selection.append('line')
      .attr('class', 'movable-line-cover movable-line-upper-cover')
    newLineObject.handleLower = selection.append('rect')
        .attr('class', 'movable-line-handle movable-line-lower-handle')
    newLineObject.handleMiddle = selection.append('rect')
        .attr('class', 'movable-line-handle movable-line-middle-handle')
    newLineObject.handleUpper = selection.append('rect')
        .attr('class', 'movable-line-handle movable-line-upper-handle')

    // Set up the corresponding equation box
    // Define the selector that corresponds with the adornment container
    // TODO: Make this value more specific or find another way to target the correct element. It's currently 
    // causing a bug when there is more than one graph present -- the equation box can be added to the wrong 
    // graph because the selector is too generic.
    const adornmentContainer = `${kGraphAdornmentsClassSelector}__cell:nth-child(${plotIndex + 1})`
    // Define the class name for the equation container
    const movableLineClass =
      `movable-line-equation-container${lineKey && lineKey !== '' ? `-${setClassNameFromKey(lineKey)}` : ''}`
    const equationDiv = select(adornmentContainer).append('div')
      .attr('class', `movable-line-equation-container  ${movableLineClass}`)
      .style('width', `${plotWidth}px`)
      .style('height', `${plotHeight}px`)
    newLineObject.equation = equationDiv
      .append('p')
      .attr('class', 'movable-line-equation')
      .style('opacity', 0)
      .transition()
      .duration(1000)
      .style('opacity', 1)
    setLineObject(newLineObject)

    return () => {
      equationDiv.transition()
        .duration(1000)
        .style('opacity', 0)
        .end().then(() => {
          equationDiv.remove()
        })
    }
  }, [])

  return (
    <svg
      className={`line-${setClassNameFromKey(lineKey)}`}
      style={{height: `${plotHeight}px`, overflow: 'hidden', width: `${plotWidth}px`}}
      x={0}
      y={0}
    >
      <g>
        <g ref={lineRef}/>
      </g>
    </svg>
  )
}
