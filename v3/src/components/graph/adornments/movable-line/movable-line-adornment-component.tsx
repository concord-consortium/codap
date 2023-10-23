import React, {useCallback, useEffect, useRef, useState} from "react"
import {autorun} from "mobx"
import { observer } from "mobx-react-lite"
import {drag, select} from "d3"
import {useAxisLayoutContext} from "../../../axis/models/axis-layout-context"
import {ScaleNumericBaseType} from "../../../axis/axis-types"
import {INumericAxisModel} from "../../../axis/models/axis-model"
import {computeSlopeAndIntercept, equationString, IAxisIntercepts,
        lineToAxisIntercepts} from "../../utilities/graph-utils"
import {useGraphDataConfigurationContext} from "../../hooks/use-data-configuration-context"
import {useInstanceIdContext} from "../../../../hooks/use-instance-id-context"
import { IMovableLineAdornmentModel } from "./movable-line-adornment-model"
import { useGraphContentModelContext } from "../../hooks/use-graph-content-model-context"

import "./movable-line-adornment-component.scss"

function equationContainer(model: IMovableLineAdornmentModel, cellKey: Record<string, string>, containerId: string) {
  const classFromKey = model.classNameFromKey(cellKey)
  const equationContainerClass = `movable-line-equation-container-${classFromKey}`
  const equationContainerSelector = `#${containerId} .${equationContainerClass}`

  return { equationContainerClass, equationContainerSelector }
}

interface IProps {
  containerId: string
  model: IMovableLineAdornmentModel
  plotHeight: number
  plotWidth: number
  cellKey: Record<string, string>
  xAxis: INumericAxisModel
  yAxis: INumericAxisModel
}

export const MovableLineAdornment = observer(function MovableLineAdornment(props: IProps) {
  const {containerId, model, plotHeight, plotWidth, cellKey={}, xAxis, yAxis} = props
  const graphModel = useGraphContentModelContext()
  const dataConfig = useGraphDataConfigurationContext()
  const layout = useAxisLayoutContext()
  const instanceId = useInstanceIdContext()
  const xScale = layout.getAxisScale("bottom") as ScaleNumericBaseType
  const xRange = xScale.range()
  const xScaleCopy = xScale.copy()
  const yScale = layout.getAxisScale("left") as ScaleNumericBaseType
  const yRange = yScale.range()
  const yScaleCopy = yScale.copy()
  const kTolerance = 4 // pixels to snap to horizontal or vertical
  const kHandleSize = 12
  const instanceKey = model.instanceKey(cellKey)
  const classFromKey = model.classNameFromKey(cellKey)
  const {equationContainerClass, equationContainerSelector} = equationContainer(model, cellKey, containerId)
  const lineRef = useRef() as React.RefObject<SVGSVGElement>
  const [lineObject, setLineObject] = useState<{ [index: string]: any }>({
    line: null, lower: null, middle: null, upper: null, equation: null
  })
  const pointsOnAxes = useRef<IAxisIntercepts>({pt1: {x: 0, y: 0}, pt2: {x: 0, y: 0}})

  // Set scale copy ranges. The scale copies are used when computing the line's
  // coordinates during dragging.
  xScaleCopy.range([0, plotWidth])
  yScaleCopy.range([plotHeight, 0])

  // get attributes for use in equation
  const allAttributes = dataConfig?.dataset?.attributes
  const xAttrId = dataConfig?.attributeID("x") || ""
  const yAttrId = dataConfig?.attributeID("y") || ""
  const xAttr = allAttributes?.find(attr => attr.id === xAttrId)
  const yAttr = allAttributes?.find(attr => attr.id === yAttrId)
  const xAttrName = xAttr?.name ?? ""
  const yAttrName = yAttr?.name ?? ""
  const xSubAxesCount = layout.getAxisMultiScale("bottom")?.repetitions ?? 1
  const ySubAxesCount = layout.getAxisMultiScale("left")?.repetitions ?? 1

  const refreshEquation = useCallback((slope: number, intercept: number) => {
    const screenX = xScale((pointsOnAxes.current.pt1.x + pointsOnAxes.current.pt2.x) / 2) / xSubAxesCount
    const screenY = yScale((pointsOnAxes.current.pt1.y + pointsOnAxes.current.pt2.y) / 2) / ySubAxesCount
    const attrNames = {x: xAttrName, y: yAttrName}
    const string = equationString(slope, intercept, attrNames)
    const equation = select(equationContainerSelector).select("p")

    select(equationContainerSelector)
      .style("width", `${plotWidth}px`)
      .style("height", `${plotHeight}px`)
    equation.html(string)
    // The equation may have been unpinned from the line if the user dragged it away from the line.
    // Only move the equation if it is still pinned (i.e. equationCoords is not valid).
    const lineModel = model.lines.get(instanceKey)
    const equationCoords = lineModel?.equationCoords
    if (!equationCoords?.isValid()) {
      equation.style("left", `${screenX}px`)
        .style("top", `${screenY}px`)
    } else {
      const left = equationCoords.x * 100
      const top = equationCoords.y * 100
      equation.style("left", `${left}%`)
              .style("top", `${top}%`)
    }
  }, [equationContainerSelector, instanceKey, model.lines, plotHeight, plotWidth, xAttrName,
      xScale, xSubAxesCount, yAttrName, yScale, ySubAxesCount])

  const updateLine = useCallback(() => {
    // The coordinates at which the line intersects the axes
    const pixelPtsOnAxes = {
      pt1: {
        x: xScale(pointsOnAxes.current.pt1.x) / xSubAxesCount,
        y: yScale(pointsOnAxes.current.pt1.y) / ySubAxesCount
      },
      pt2: {
        x: xScale(pointsOnAxes.current.pt2.x) / xSubAxesCount,
        y: yScale(pointsOnAxes.current.pt2.y) / ySubAxesCount
      }
    }

    const breakPt1 = {
      x: pixelPtsOnAxes.pt1.x + (3 / 8) * (pixelPtsOnAxes.pt2.x - pixelPtsOnAxes.pt1.x),
      y: pixelPtsOnAxes.pt1.y + (3 / 8) * (pixelPtsOnAxes.pt2.y - pixelPtsOnAxes.pt1.y)
    }
    const breakPt2 = {
      x: pixelPtsOnAxes.pt1.x + (5 / 8) * (pixelPtsOnAxes.pt2.x - pixelPtsOnAxes.pt1.x),
      y: pixelPtsOnAxes.pt1.y + (5 / 8) * (pixelPtsOnAxes.pt2.y - pixelPtsOnAxes.pt1.y)
    }
    const endPointsArray = [
      {pt1: pixelPtsOnAxes.pt1, pt2: pixelPtsOnAxes.pt2},
      {pt1: pixelPtsOnAxes.pt1, pt2: breakPt1},
      {pt1: breakPt1, pt2: breakPt2},
      {pt1: breakPt2, pt2: pixelPtsOnAxes.pt2}
    ]

    function fixEndPoints(iLine: any, index: number) {
      iLine
        .attr("x1", endPointsArray[index].pt1.x)
        .attr("y1", endPointsArray[index].pt1.y)
        .attr("x2", endPointsArray[index].pt2.x)
        .attr("y2", endPointsArray[index].pt2.y)
    }

    function fixHandles(iRect: any, index: number) {
      const xCenter = (endPointsArray[index].pt1.x + endPointsArray[index].pt2.x) / 2,
        yCenter = (endPointsArray[index].pt1.y + endPointsArray[index].pt2.y) / 2
      iRect
        .attr("x", xCenter - kHandleSize / 2)
        .attr("y", yCenter - kHandleSize / 2)
    }

    fixEndPoints(lineObject.line, 0)
    fixEndPoints(lineObject.lower, 1)
    fixEndPoints(lineObject.middle, 2)
    fixEndPoints(lineObject.upper, 3)
    fixHandles(lineObject.handleLower, 1)
    fixHandles(lineObject.handleMiddle, 2)
    fixHandles(lineObject.handleUpper, 3)

  }, [lineObject.handleLower, lineObject.handleMiddle, lineObject.handleUpper, lineObject.line,
      lineObject.lower, lineObject.middle, lineObject.upper, xScale, xSubAxesCount, yScale, ySubAxesCount])

  // Middle cover drag handler
  const handleTranslate = useCallback((event: MouseEvent, isFinished=false) => {
    const lineParams = model.lines?.get(instanceKey)
    const slope = lineParams?.slope || 0
    const intercept = lineParams?.intercept || 0
    const tWorldX = xScaleCopy.invert(event.x)
    const tWorldY = yScaleCopy.invert(event.y)

    // If the line is dragged outside plot area, reset it to the initial state
    if (
        tWorldX < xScaleCopy.domain()[0] ||
        tWorldX > xScaleCopy.domain()[1] ||
        tWorldY < yScaleCopy.domain()[0] ||
        tWorldY > yScaleCopy.domain()[1]
    ) {
      const { intercept: initIntercept, slope: initSlope } = computeSlopeAndIntercept(xAxis, yAxis)
      model.setLine({slope: initSlope, intercept: initIntercept}, instanceKey)
      return
    }

    const newIntercept = isFinite(slope) ? tWorldY - slope * tWorldX : tWorldX
    const {domain: xDomain} = xAxis
    const {domain: yDomain} = yAxis
    pointsOnAxes.current = lineToAxisIntercepts(slope, newIntercept, xDomain, yDomain)
    updateLine()
    refreshEquation(slope, intercept)

    if (isFinished) {
      const equationCoords = lineParams?.equationCoords
      model.setLine({slope, intercept: newIntercept, equationCoords}, instanceKey)
    }
  }, [instanceKey, model, refreshEquation, updateLine, xAxis, xScaleCopy, yAxis, yScaleCopy])

  const handleRotation = useCallback((
    event: { x: number, y: number, dx: number, dy: number },
    lineSection: string,
    isFinished=false
  ) => {
    const lineParams = model.lines?.get(instanceKey)
    if (!lineParams) return

    if (event.dx !== 0 || event.dy !== 0 || isFinished) {
      const equationCoords = lineParams?.equationCoords

      // The current pivot is the pivot point on the line section not being dragged.
      // lineParams.pivot1 is the pivot point on the lower section, lineParams.pivot2 is the
      // pivot point on the upper section
      const currentPivot = lineSection === "lower" ? lineParams?.pivot2 : lineParams?.pivot1
    
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

      lineObject.lower.classed("negative-slope", newSlope < 0)
      lineObject.upper.classed("negative-slope", newSlope < 0)
  
      const {domain: xDomain} = xAxis
      const {domain: yDomain} = yAxis
      pointsOnAxes.current = lineToAxisIntercepts(newSlope, newIntercept, xDomain, yDomain)
      updateLine()
      refreshEquation(newSlope, newIntercept)

      if (isFinished) {
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
    }
  }, [model, instanceKey, xScaleCopy, yScaleCopy, lineObject.lower, lineObject.upper, xAxis, yAxis,
      updateLine, refreshEquation])

  const handleMoveEquation = useCallback((
    event: { x: number, y: number, dx: number, dy: number },
    isFinished=false
  ) => {
    if (event.dx !== 0 || event.dy !== 0 || isFinished) {
      const equation = select(`${equationContainerSelector} p`)
      const equationNode = equation.node() as Element
      const equationWidth = equationNode?.getBoundingClientRect().width || 0
      const equationHeight = equationNode?.getBoundingClientRect().height || 0
      const left = event.x - equationWidth / 2
      const top = event.y - equationHeight / 2
      equation.style("left", `${left}px`)
        .style("top", `${top}px`)

      if (isFinished) {
        const lineModel = model.lines.get(instanceKey)
        // Get the percentage of plot width and height of the equation box's coordinates
        // for a more accurate placement of the equation box.
        const x = left / plotWidth
        const y = top / plotHeight
        graphModel.applyUndoableAction(
          () => lineModel?.setEquationCoords({x, y}),
          "DG.Undo.graph.repositionEquation", "DG.Redo.graph.repositionEquation"
        )
      }
    }
  }, [equationContainerSelector, graphModel, instanceKey, model.lines, plotHeight, plotWidth])

  // Refresh the line
  useEffect(function refresh() {
    const disposer = autorun(() => {
      const lineModel = model.lines.get(instanceKey)
      if (!lineObject.line || !lineModel) return

      const { slope, intercept } = lineModel
      const {domain: xDomain} = xAxis
      const {domain: yDomain} = yAxis
      pointsOnAxes.current = lineToAxisIntercepts(slope, intercept, xDomain, yDomain)
      updateLine()
      refreshEquation(slope, intercept)
    })
    return () => disposer()
  }, [instanceId, pointsOnAxes, lineObject, plotHeight, plotWidth, xScale, yScale, model,
      model.lines, xAttrName, xSubAxesCount, xAxis, yAttrName, ySubAxesCount, yAxis, xRange,
      yRange, equationContainerSelector, cellKey, instanceKey, updateLine, refreshEquation])

  // Add the behaviors to the line segments
  useEffect(function addBehaviors() {
    const behaviors: { [index: string]: any } = {
      lower: drag()
        .on("drag", (e) => handleRotation(e, "lower"))
        .on("end", (e) => handleRotation(e, "lower", true)),
      middle: drag()
        .on("drag", (e) => handleTranslate(e))
        .on("end", (e) => handleTranslate(e, true)),
      upper: drag()
        .on("drag", (e) => handleRotation(e, "upper"))
        .on("end", (e) => handleRotation(e, "lower", true)),
      equation: drag()
        .on("drag", (e) => handleMoveEquation(e))
        .on("end", (e) => handleMoveEquation(e, true))
    }

    lineObject.lower?.call(behaviors.lower)
    lineObject.middle?.call(behaviors.middle)
    lineObject.upper?.call(behaviors.upper)
    lineObject.equation?.call(behaviors.equation)
  }, [lineObject, handleTranslate, handleRotation, handleMoveEquation])

  // Build the line and its cover segments and handles just once
  useEffect(function createElements() {
    const selection = select(lineRef.current)
    const newLineObject: any = {}

    // Set up the line and its cover segments and handles
    newLineObject.line = selection.append("line")
      .attr("class", "movable-line movable-line-${classFromCellKey}")
      .attr("data-testid", `movable-line${classFromKey ? `-${classFromKey}` : ""}`)
    newLineObject.lower = selection.append("line")
      .attr("class", "movable-line-cover movable-line-lower-cover")
    newLineObject.middle = selection.append("line")
      .attr("class", "movable-line-cover movable-line-middle-cover")
    newLineObject.upper = selection.append("line")
      .attr("class", "movable-line-cover movable-line-upper-cover")
    newLineObject.handleLower = selection.append("rect")
        .attr("class", "movable-line-handle movable-line-lower-handle show-on-tile-selected")
    newLineObject.handleMiddle = selection.append("rect")
        .attr("class", "movable-line-handle movable-line-middle-handle show-on-tile-selected")
    newLineObject.handleUpper = selection.append("rect")
        .attr("class", "movable-line-handle movable-line-upper-handle show-on-tile-selected")

    // Set up the corresponding equation box
    // Define the selector that corresponds with this specific movable line's adornment container
    const equationDiv = select(`#${containerId}`).append("div")
      .attr("class", `movable-line-equation-container ${equationContainerClass}`)
      .attr("data-testid", `${equationContainerClass}`)
      .style("width", `${plotWidth}px`)
      .style("height", `${plotHeight}px`)
  
    const equationP = equationDiv
      .append("p")
      .attr("class", "movable-line-equation")
      .attr("data-testid", `movable-line-equation-${model.classNameFromKey(cellKey)}`)
      .on("mouseover", () => { newLineObject.line.style("stroke-width", 2) })
      .on("mouseout", () => { newLineObject.line.style("stroke-width", 1) })

    // If the equation is not pinned to the line, set its initial coordinates to
    // the values specified in the model.
    const equationCoords = model.lines?.get(instanceKey)?.equationCoords
    if (equationCoords?.isValid()) {
      const left = equationCoords.x * 100
      const top = equationCoords.y * 100
      equationP.style("left", `${left}%`)
        .style("top", `${top}%`)
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
      className={`line-${model.classNameFromKey(cellKey)}`}
      style={{height: "100%", width: "100%"}}
      x={0}
      y={0}
    >
      <g>
        <g ref={lineRef}/>
      </g>
    </svg>
  )
})
