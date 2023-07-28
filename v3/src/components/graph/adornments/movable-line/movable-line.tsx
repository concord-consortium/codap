import React, {useCallback, useEffect, useRef, useState} from "react"
import {autorun} from "mobx"
import { observer } from "mobx-react-lite"
import {drag, select} from "d3"
import {useAxisLayoutContext} from "../../../axis/models/axis-layout-context"
import {ScaleNumericBaseType} from "../../../axis/axis-types"
import {INumericAxisModel} from "../../../axis/models/axis-model"
import {computeSlopeAndIntercept, equationString, IAxisIntercepts,
        lineToAxisIntercepts} from "../../utilities/graph-utils"
import {useDataConfigurationContext} from "../../hooks/use-data-configuration-context"
import {useInstanceIdContext} from "../../../../hooks/use-instance-id-context"
import { IMovableLineModel } from "./movable-line-model"

import "./movable-line.scss"

function equationContainer(model: IMovableLineModel, subPlotKey: Record<string, string>, containerId: string) {
  const classFromKey = model.classNameFromKey(subPlotKey),
    equationContainerClass = `movable-line-equation-container-${classFromKey}`,
    equationContainerSelector = `#${containerId} .${equationContainerClass}`
    return { equationContainerClass, equationContainerSelector }
}

interface IProps {
  containerId: string
  model: IMovableLineModel
  plotHeight: number
  plotWidth: number
  subPlotKey: Record<string, string>
  xAxis: INumericAxisModel
  yAxis: INumericAxisModel
}

export const MovableLine = observer(function MovableLine(props: IProps) {
  const {containerId, model, plotHeight, plotWidth, subPlotKey={}, xAxis, yAxis} = props,
    dataConfig = useDataConfigurationContext(),
    layout = useAxisLayoutContext(),
    instanceId = useInstanceIdContext(),
    xScale = layout.getAxisScale("bottom") as ScaleNumericBaseType,
    xRange = xScale.range(),
    xScaleCopy = xScale.copy(),
    yScale = layout.getAxisScale("left") as ScaleNumericBaseType,
    yRange = yScale.range(),
    yScaleCopy = yScale.copy(),
    kTolerance = 4, // pixels to snap to horizontal or vertical
    kHandleSize = 12,
    instanceKey = model.instanceKey(subPlotKey),
    {equationContainerClass, equationContainerSelector} = equationContainer(model, subPlotKey, containerId),
    lineRef = useRef() as React.RefObject<SVGSVGElement>,
    [lineObject, setLineObject] = useState<{ [index: string]: any }>({
      line: null, lower: null, middle: null, upper: null, equation: null
    }),
    pointsOnAxes = useRef<IAxisIntercepts>()

    // Set scale copy ranges. The scale copies are used when computing the line's
    // coordinates during dragging.
    xScaleCopy.range([0, plotWidth])
    yScaleCopy.range([plotHeight, 0])

  // get attributes for use in equation
  const allAttributes = dataConfig?.dataset?.attributes,
    xAttrId = dataConfig?.attributeID('x') || '',
    yAttrId = dataConfig?.attributeID('y') || '',
    xAttr = allAttributes?.find(attr => attr.id === xAttrId),
    yAttr = allAttributes?.find(attr => attr.id === yAttrId),
    xAttrName = xAttr?.name ?? '',
    yAttrName = yAttr?.name ?? '',
    xSubAxesCount = layout.getAxisMultiScale('bottom')?.repetitions ?? 1,
    ySubAxesCount = layout.getAxisMultiScale('left')?.repetitions ?? 1

  // Refresh the line
  useEffect(function refresh() {
      const disposer = autorun(() => {
        const lineModel = model.lines.get(instanceKey)
        if (!lineObject.line || !lineModel) return

        const { slope, intercept } = lineModel,
          {domain: xDomain} = xAxis,
          {domain: yDomain} = yAxis
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
            equation = select(equationContainerSelector).select('p')
  
          select(equationContainerSelector)
            .style('width', `${plotWidth}px`)
            .style('height', `${plotHeight}px`)
          equation.html(string)
          // The equation may have been unpinned from the line if the user
          // dragged it away from the line. Only move the equation if it
          // is still pinned.
          if (!lineModel?.equationCoords?.isValid()) {
            equation.style('left', `${screenX}px`)
              .style('top', `${screenY}px`)
          }
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
    }, [instanceId, pointsOnAxes, lineObject, plotHeight, plotWidth, xScale, yScale, model, model.lines,
        xAttrName, xSubAxesCount, xAxis, yAttrName, ySubAxesCount, yAxis, xRange, yRange,
        equationContainerSelector, subPlotKey, instanceKey]
  )

  const
    // Middle cover drag handler
    continueTranslate = useCallback((event: MouseEvent) => {
      const lineParams = model.lines?.get(instanceKey),
        slope = lineParams?.slope || 0,
        equationCoords = lineParams?.equationCoords,
        tWorldX = xScaleCopy.invert(event.x),
        tWorldY = yScaleCopy.invert(event.y)

      // If the line is dragged outside plot area, reset it to the initial state
      if (
          tWorldX < xScaleCopy.domain()[0] ||
          tWorldX > xScaleCopy.domain()[1] ||
          tWorldY < yScaleCopy.domain()[0] ||
          tWorldY > yScaleCopy.domain()[1]
      ) {
        const { intercept, slope: initSlope } = computeSlopeAndIntercept(xAxis, yAxis)
        model.setLine({slope: initSlope, intercept}, instanceKey)
        return
      }

      const newIntercept = isFinite(slope) ? tWorldY - slope * tWorldX : tWorldX
      model.setLine({slope, intercept: newIntercept, equationCoords}, instanceKey)
    }, [instanceKey, model, xAxis, xScaleCopy, yAxis, yScaleCopy]),

    continueRotation = useCallback((
      event: { x: number, y: number, dx: number, dy: number },
      lineSection: string
    ) => {
      if (!pointsOnAxes.current) return
      const lineParams = model.lines?.get(instanceKey)
      // The current pivot is the pivot point on the line section not being dragged.
      // lineParams.pivot1 is the pivot point on the lower section, lineParams.pivot2 is the
      // pivot point on the upper section
      const currentPivot = lineSection === "lower" ? lineParams?.pivot2 : lineParams?.pivot1
      const equationCoords = lineParams?.equationCoords
    
      if (event.dx !== 0 || event.dy !== 0) {
        let isVertical = false
        // The new pivot will be the point on the line section where it is being dragged.
        const newPivot = { x: xScaleCopy.invert(event.x), y: yScaleCopy.invert(event.y) }
        // If the current pivot isn't valid, use the point where the other line section intersects the
        // axes as the pivot point.
        const pivot = currentPivot?.isValid()
                        ? currentPivot
                        : lineSection === "lower"
                          ? pointsOnAxes.current.pt2
                          : pointsOnAxes.current.pt1
    
        // If the line is perfectly vertical, set the new pivot's x coordinate to the x coordinate of the
        // original pivot. If the line is perfectly horizontal, set the new pivot's y coordinate to the y
        // coordinate of the original pivot.
        if (Math.abs(xScaleCopy(newPivot.x) - xScaleCopy(pivot.x)) < kTolerance) { // vertical
          newPivot.x = pivot.x
          isVertical = true
        } else if (Math.abs(yScaleCopy(newPivot.y) - yScaleCopy(pivot.y)) < kTolerance) { // horizontal
          newPivot.y = pivot.y
        }

        let newSlope, newIntercept
        if (isVertical) {
          newSlope = Number.POSITIVE_INFINITY
          newIntercept = pivot.x
        } else {
          newSlope = lineSection === "lower"
            ? (pivot.y - newPivot.y) / (pivot.x - newPivot.x)
            : (newPivot.y - pivot.y) / (newPivot.x - pivot.x)
          newIntercept = newPivot.y - newSlope * newPivot.x
        }

        lineObject.lower.classed('negative-slope', newSlope < 0)
        lineObject.upper.classed('negative-slope', newSlope < 0)
    
        model.setLine(
          {
            slope: newSlope,
            intercept: newIntercept,
            pivot1: lineSection === "lower" ? newPivot : pivot,
            pivot2: lineSection === "lower" ? pivot : newPivot,
            equationCoords,
          },
          instanceKey
        )
      }
    }, [instanceKey, lineObject.lower, lineObject.upper, model, xScaleCopy, yScaleCopy]),

    moveEquation = useCallback((event: { x: number, y: number, dx: number, dy: number }) => {
      if (event.dx !== 0 || event.dy !== 0) {
        const equation = select(`${equationContainerSelector} p`),
          equationNode = equation.node() as Element,
          equationWidth = equationNode?.getBoundingClientRect().width || 0,
          equationHeight = equationNode?.getBoundingClientRect().height || 0,
          left = event.x - equationWidth / 2,
          top = event.y - equationHeight / 2,
          lineModel = model.lines.get(instanceKey),
          // Get the percentage of plotWidth of the equation box's coordinates
          // for a more accurate placement of the equation box.
          x = left / plotWidth,
          y = top / plotHeight

        lineModel?.setEquationCoords({x, y})
        equation.style('left', `${left}px`)
          .style('top', `${top}px`)
      }
    }, [equationContainerSelector, instanceKey, model.lines, plotWidth, plotHeight])

  // Add the behaviors to the line segments
  useEffect(function addBehaviors() {
    const behaviors: { [index: string]: any } = {
      lower: drag()
        .on("drag", (e) => continueRotation(e, "lower")),
      middle: drag()
        .on("drag", continueTranslate),
      upper: drag()
        .on("drag", (e) => continueRotation(e, "upper")),
      equation: drag()
        .on("drag", moveEquation)
    }

    lineObject.lower?.call(behaviors.lower)
    lineObject.middle?.call(behaviors.middle)
    lineObject.upper?.call(behaviors.upper)
    lineObject.equation?.call(behaviors.equation)
  }, [lineObject, continueTranslate, continueRotation, moveEquation])

  // Build the line and its cover segments and handles just once
  useEffect(function createElements() {
    const selection = select(lineRef.current),
      newLineObject: any = {}

    // Set up the line and its cover segments and handles
    newLineObject.line = selection.append('line')
      .attr('class', 'movable-line')
      .attr('data-testid', `movable-line`)
    newLineObject.lower = selection.append('line')
      .attr('class', 'movable-line-cover movable-line-lower-cover')
    newLineObject.middle = selection.append('line')
      .attr('class', 'movable-line-cover movable-line-middle-cover')
    newLineObject.upper = selection.append('line')
      .attr('class', 'movable-line-cover movable-line-upper-cover')
    newLineObject.handleLower = selection.append('rect')
        .attr('class', 'movable-line-handle movable-line-lower-handle show-on-tile-selected')
    newLineObject.handleMiddle = selection.append('rect')
        .attr('class', 'movable-line-handle movable-line-middle-handle show-on-tile-selected')
    newLineObject.handleUpper = selection.append('rect')
        .attr('class', 'movable-line-handle movable-line-upper-handle show-on-tile-selected')

    // Set up the corresponding equation box
    // Define the selector that corresponds with this specific movable line's adornment container
    const equationDiv = select(`#${containerId}`).append('div')
      .attr('class', `movable-line-equation-container ${equationContainerClass}`)
      .attr('data-testid', `${equationContainerClass}`)
      .style('width', `${plotWidth}px`)
      .style('height', `${plotHeight}px`)
  
    const equationP = equationDiv
      .append('p')
      .attr('class', 'movable-line-equation')
      .attr('data-testid', `movable-line-equation-${model.classNameFromKey(subPlotKey)}`)
      .on('mouseover', () => { newLineObject.line.style('stroke-width', 2) })
      .on('mouseout', () => { newLineObject.line.style('stroke-width', 1) })

    // If the equation is not pinned to the line, set its initial coordinates to
    // the values specified in the model.
    const equationCoords = model.lines?.get(instanceKey)?.equationCoords
    if (equationCoords?.isValid()) {
      const left = equationCoords.x * 100,
        top = equationCoords.y * 100
      equationP.style('left', `${left}%`)
        .style('top', `${top}%`)
    }

    newLineObject.equation = equationDiv
    setLineObject(newLineObject)

    return () => {
      equationDiv.remove()
    }
  // This effect should only run once on mount, otherwise it would create multiple 
  // instances of the line elements
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <svg
      className={`line-${model.classNameFromKey(subPlotKey)}`}
      style={{height: `${plotHeight}px`, width: `${plotWidth}px`}}
      x={0}
      y={0}
    >
      <g>
        <g ref={lineRef}/>
      </g>
    </svg>
  )
})
