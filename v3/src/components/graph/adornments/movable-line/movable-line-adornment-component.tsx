import React, {useCallback, useEffect, useRef, useState} from "react"
import { observer } from "mobx-react-lite"
import {drag, select, Selection} from "d3"
import {useInstanceIdContext} from "../../../../hooks/use-instance-id-context"
import { LogMessageFn, logMessageWithReplacement, logModelChangeFn } from "../../../../lib/log-message"
import { mstAutorun } from "../../../../utilities/mst-autorun"
import { safeGetSnapshot } from "../../../../utilities/mst-utils"
import { useAdornmentAttributes } from "../../hooks/use-adornment-attributes"
import { useAdornmentCategories } from "../../hooks/use-adornment-categories"
import { useAdornmentCells } from "../../hooks/use-adornment-cells"
import { useGraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import {useGraphDataConfigurationContext} from "../../hooks/use-graph-data-configuration-context"
import { useGraphLayoutContext } from "../../hooks/use-graph-layout-context"
import {
  calculateSumOfSquares, computeSlopeAndIntercept, equationString, IAxisIntercepts, lineToAxisIntercepts
} from "../../utilities/graph-utils"
import { IAdornmentComponentProps } from "../adornment-component-info"
import { IAdornmentModel } from "../adornment-models"
import { Point } from "../point-model"
import { getAxisDomains } from "../utilities/adornment-utils"
import { IMovableLineAdornmentModel } from "./movable-line-adornment-model"

import "./movable-line-adornment-component.scss"

function equationContainerDefs(model: IAdornmentModel, cellKey: Record<string, string>, containerId: string) {
  const classFromKey = model.classNameFromKey(cellKey)
  const equationContainerClass = `movable-line-equation-container-${classFromKey}`
  const equationContainerSelector = `#${containerId} .${equationContainerClass}`

  return { equationContainerClass, equationContainerSelector }
}

interface IPointsOnAxes {
  pt1: Point
  pt2: Point
}

interface ILine {
  equation?: Selection<HTMLDivElement, unknown, HTMLElement, undefined>
  handleLower?: Selection<SVGRectElement, unknown, null, undefined>
  handleMiddle?: Selection<SVGRectElement, unknown, null, undefined>
  handleUpper?: Selection<SVGRectElement, unknown, null, undefined>
  line?: Selection<SVGLineElement, unknown, null, undefined>
  lower?: Selection<SVGLineElement, unknown, null, undefined>
  middle?: Selection<SVGLineElement, unknown, null, undefined>
  upper?: Selection<SVGLineElement, unknown, null, undefined>
}

export const MovableLineAdornment = observer(function MovableLineAdornment(props: IAdornmentComponentProps) {
  const {containerId, plotHeight, plotWidth, cellKey={}, xAxis, yAxis} = props
  const model = props.model as IMovableLineAdornmentModel
  const graphModel = useGraphContentModelContext()
  const dataConfig = useGraphDataConfigurationContext()
  const layout = useGraphLayoutContext()
  const instanceId = useInstanceIdContext()
  const adornmentsStore = graphModel.adornmentsStore
  const { xAttrId, xAttrName, yAttrId, yAttrName, xScale, yScale } = useAdornmentAttributes()
  const { classFromKey, instanceKey } = useAdornmentCells(model, cellKey)
  const { xSubAxesCount, ySubAxesCount } = useAdornmentCategories()
  const xRange = xScale.range()
  const yRange = yScale.range()
  const kTolerance = 4 // pixels to snap to horizontal or vertical
  const kHandleSize = 12
  const interceptLocked = adornmentsStore?.interceptLocked
  const {equationContainerClass, equationContainerSelector} = equationContainerDefs(model, cellKey, containerId)
  const lineRef = useRef() as React.RefObject<SVGSVGElement>
  const [lineObject, setLineObject] = useState<ILine>({})
  const pointsOnAxes = useRef<IAxisIntercepts>({pt1: {x: 0, y: 0}, pt2: {x: 0, y: 0}})
  const xScaleRef = useRef(xScale.copy())
  const yScaleRef = useRef(yScale.copy())
  const logFn = useRef<Maybe<LogMessageFn>>()

  // Set scale copy ranges. The scale copies are used when computing the line's coordinates during
  // dragging. We modify the ranges of the scale copies to match the sub plot's width and height so that
  // the line's coordinates are computed correctly. The original scales use the entire plot's width and
  // height, which won't work when there are multiple subplots.
  xScaleRef.current.range([0, plotWidth])
  yScaleRef.current.range([plotHeight, 0])

  const getEquationString = useCallback((slope: number, intercept: number, type: "display" | "log") => {
    const attrNames = {x: xAttrName, y: yAttrName}
    const xUnits = dataConfig?.dataset?.getAttribute(xAttrId)?.units
    const yUnits = dataConfig?.dataset?.getAttribute(yAttrId)?.units
    const units = {x: xUnits, y: yUnits}
    // compute sum of squares for display but not for logging
    const sumOfSquares = type === "display" && dataConfig && graphModel?.adornmentsStore.showSquaresOfResiduals
      ? calculateSumOfSquares({ cellKey, dataConfig, computeY: (x) => intercept + slope * x })
      : undefined
    return equationString({slope, intercept, attrNames, units, sumOfSquares, layout})
  }, [cellKey, dataConfig, graphModel, layout, xAttrId, xAttrName, yAttrId, yAttrName])

  const refreshEquation = useCallback((slope: number, intercept: number) => {
    const lineInstance = model.lines.get(instanceKey)
    const screenX = xScaleRef.current((pointsOnAxes.current.pt1.x + pointsOnAxes.current.pt2.x) / 2) / xSubAxesCount
    const screenY = yScaleRef.current((pointsOnAxes.current.pt1.y + pointsOnAxes.current.pt2.y) / 2) / ySubAxesCount
    const string = getEquationString(slope, intercept, "display")
    const equation = select<HTMLDivElement, unknown>(equationContainerSelector).select<HTMLParagraphElement>("p")

    select(equationContainerSelector)
      .style("width", `${plotWidth}px`)
      .style("height", `${plotHeight}px`)
    equation.html(string)

    const equationBounds = equation.node()?.getBoundingClientRect()
    // rendered extents are used for rendering and for exporting in v2 format
    lineInstance?.setExtents({
      labelWidth: equationBounds?.width,
      labelHeight: equationBounds?.height,
      plotWidth,
      plotHeight
    })

    // The equation may have been unpinned from the line if the user dragged it away from the line.
    // Only move the equation if it is still pinned (i.e. equationCoords is not valid).
    const labelPos = lineInstance?.labelPosition
    if (!labelPos) {
      equation.style("left", `${screenX}px`)
        .style("top", `${screenY}px`)
    } else {
      equation.style("left", `${labelPos.left}px`)
              .style("top", `${labelPos.top}px`)
    }
  }, [equationContainerSelector, getEquationString, instanceKey, model, plotHeight, plotWidth,
      xSubAxesCount, ySubAxesCount])

  const breakPointCoords = useCallback((
    pixelPtsOnAxes: IPointsOnAxes, breakPointNum: number, _interceptLocked: boolean
  ) => {
    if (_interceptLocked) return {x: xScaleRef.current(0), y: yScaleRef.current(0)}
    const weight = breakPointNum === 1 ? 3/8 : 5/8
    const x = pixelPtsOnAxes.pt1.x + weight * (pixelPtsOnAxes.pt2.x - pixelPtsOnAxes.pt1.x)
    const y = pixelPtsOnAxes.pt1.y + weight * (pixelPtsOnAxes.pt2.y - pixelPtsOnAxes.pt1.y)
    return {x, y}
  }, [])

  const updateLine = useCallback(() => {
    // The coordinates at which the line intersects the axes
    const pixelPtsOnAxes = {
      pt1: {
        x: xScaleRef.current(pointsOnAxes.current.pt1.x),
        y: yScaleRef.current(pointsOnAxes.current.pt1.y)
      },
      pt2: {
        x: xScaleRef.current(pointsOnAxes.current.pt2.x),
        y: yScaleRef.current(pointsOnAxes.current.pt2.y)
      }
    }

    const breakPt1 = breakPointCoords(pixelPtsOnAxes, 1, interceptLocked)
    const breakPt2 = breakPointCoords(pixelPtsOnAxes, 2, interceptLocked)
    const endPointsArray = [
      {pt1: pixelPtsOnAxes.pt1, pt2: pixelPtsOnAxes.pt2},
      {pt1: pixelPtsOnAxes.pt1, pt2: breakPt1},
      {pt1: breakPt1, pt2: breakPt2},
      {pt1: breakPt2, pt2: pixelPtsOnAxes.pt2}
    ]

    function fixEndPoints(iLine: Selection<SVGLineElement, unknown, null, undefined>, index: number) {
      iLine
        .attr("x1", endPointsArray[index].pt1.x)
        .attr("y1", endPointsArray[index].pt1.y)
        .attr("x2", endPointsArray[index].pt2.x)
        .attr("y2", endPointsArray[index].pt2.y)
    }

    function fixHandles(iRect: Selection<SVGRectElement, unknown, null, undefined>, index: number) {
      const xCenter = (endPointsArray[index].pt1.x + endPointsArray[index].pt2.x) / 2
      const yCenter = (endPointsArray[index].pt1.y + endPointsArray[index].pt2.y) / 2
      iRect.attr("x", xCenter - kHandleSize / 2)
           .attr("y", yCenter - kHandleSize / 2)
    }

    lineObject.line && fixEndPoints(lineObject.line, 0)
    lineObject.lower && fixEndPoints(lineObject.lower, 1)
    lineObject.middle && fixEndPoints(lineObject.middle, 2)
    lineObject.upper && fixEndPoints(lineObject.upper, 3)
    lineObject.handleLower && fixHandles(lineObject.handleLower, 1)
    lineObject.handleMiddle && fixHandles(lineObject.handleMiddle, 2)
    lineObject.handleUpper && fixHandles(lineObject.handleUpper, 3)

    // If the intercept is locked, hide the middle handle. It's not needed since it would then be permanently fixed
    // at the origin and not draggable.
    if (interceptLocked) {
      lineObject.handleMiddle?.style("display", "none")
    } else {
      // Let the stylesheet handle the display in this case.
      lineObject.handleMiddle?.style("display", null)
    }

  }, [breakPointCoords, interceptLocked, lineObject.handleLower, lineObject.handleMiddle, lineObject.handleUpper,
      lineObject.line, lineObject.lower, lineObject.middle, lineObject.upper])

  // Middle cover drag handler
  const handleTranslate = useCallback((event: MouseEvent, isFinished=false) => {
    if (interceptLocked) return
    const lineParams = model.lines?.get(instanceKey)
    const slope = lineParams?.slope || 0
    const tWorldX = xScaleRef.current.invert(event.x)
    const tWorldY = yScaleRef.current.invert(event.y)

    // If the line is dragged outside plot area, reset it to the initial state
    if (
        tWorldX < xScaleRef.current.domain()[0] ||
        tWorldX > xScaleRef.current.domain()[1] ||
        tWorldY < yScaleRef.current.domain()[0] ||
        tWorldY > yScaleRef.current.domain()[1]
    ) {
      const { intercept: initIntercept, slope: initSlope } = computeSlopeAndIntercept(xAxis, yAxis)
      model.setLine({slope: initSlope, intercept: initIntercept}, instanceKey)
      return
    }

    const newIntercept = isFinite(slope) ? tWorldY - slope * tWorldX : tWorldX
    const { xDomain, yDomain } = getAxisDomains(xAxis, yAxis)
    pointsOnAxes.current = lineToAxisIntercepts(slope, newIntercept, xDomain, yDomain)
    updateLine()

    // Until the user releases the line, only update the model's volatile props for the slope and intercept. Once
    // the user releases the line, update the model's slope and intercept and set the volatile props to undefined.
    // We don't want to save the values with every move of the line, but we do need to make the current values
    // available to other clients of the model via the volatile props.
    if (isFinished) {
      const equation = getEquationString(slope, newIntercept, "log")
      model.applyModelChange(() => {
        const equationCoords = lineParams?.equationCoords
        model.setLine({slope, intercept: newIntercept, equationCoords}, instanceKey)
      }, {
        log: logMessageWithReplacement("dragMovableLine: '%@'", {equation}, "plot"),
        undoStringKey: "V3.Undo.graph.adjustMovableLine",
        redoStringKey: "V3.Redo.graph.adjustMovableLine"
      })
    } else {
      model.setVolatileLine({intercept: newIntercept, slope}, instanceKey)
    }
  }, [getEquationString, instanceKey, interceptLocked, model, updateLine, xAxis, yAxis])

  const newSlopeAndIntercept = useCallback((
    pivot: Point, mousePosition: Point, lineSection: string, isVertical: boolean
  ) => {
    let newSlope, newIntercept
    if (isVertical) {
      newSlope = Number.POSITIVE_INFINITY
      newIntercept = interceptLocked ? 0 : pivot.x
    } else {
      newSlope = interceptLocked
        ? mousePosition.y / mousePosition.x
        : lineSection === "lower"
          ? (pivot.y - mousePosition.y) / (pivot.x - mousePosition.x)
          : (mousePosition.y - pivot.y) / (mousePosition.x - pivot.x)
      newIntercept = interceptLocked ? 0 : mousePosition.y - newSlope * mousePosition.x
    }
    return {newSlope, newIntercept}
  }, [interceptLocked])

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
      // The new pivot will be the point on the line section where it is currently being dragged,
      // i.e. where the mouse cursor is.
      const mousePosition = { x: xScaleRef.current.invert(event.x), y: yScaleRef.current.invert(event.y) }
      // If the intercept is locked, the pivot is fixed. Otherwise, if the current pivot isn't
      // valid, use the point where the other line section intersects the axes as the pivot point.
      const pivot = interceptLocked
        ? {x: 0, y: 0}
        : currentPivot?.isValid()
          ? currentPivot
          : lineSection === "lower"
            ? pointsOnAxes.current.pt2
            : pointsOnAxes.current.pt1

      // If the line is perfectly vertical, set the new pivot's x coordinate to the x coordinate of the
      // original pivot. If the line is perfectly horizontal, set the new pivot's y coordinate to the y
      // coordinate of the original pivot.
      let isVertical = false
      if (Math.abs(xScaleRef.current(mousePosition.x) - xScaleRef.current(pivot.x)) < kTolerance) { // vertical
        mousePosition.x = pivot.x
        isVertical = true
      } else if (Math.abs(yScaleRef.current(mousePosition.y) - yScaleRef.current(pivot.y)) < kTolerance) { // horizontal
        mousePosition.y = pivot.y
      }

      const { newSlope, newIntercept } = newSlopeAndIntercept(pivot, mousePosition, lineSection, isVertical)

      lineObject.lower?.classed("negative-slope", newSlope < 0)
      lineObject.upper?.classed("negative-slope", newSlope < 0)

      const { xDomain, yDomain } = getAxisDomains(xAxis, yAxis)
      pointsOnAxes.current = lineToAxisIntercepts(newSlope, newIntercept, xDomain, yDomain)
      updateLine()

      // Until the user releases the line, only update the model's volatile props for the slope and intercept. Once
      // the user releases the line, update the model's slope and intercept and set the volatile props to undefined.
      // We don't want to save the values with every move of the line, but we do need to make the current values
      // available to other clients of the model via the volatile props.
      if (isFinished) {
        const equation = getEquationString(newSlope, newIntercept, "log")
        model.applyModelChange(() => {
          model.setLine({
            slope: newSlope,
            intercept: newIntercept,
            pivot1: lineSection === "lower" ? mousePosition : lineParams.pivot1,
            pivot2: lineSection === "lower" ? lineParams.pivot2 : mousePosition,
            equationCoords,
          }, instanceKey)
        }, {
          log: logMessageWithReplacement("dragMovableLine: '%@'", {equation}, "plot"),
          undoStringKey: "V3.Undo.graph.adjustMovableLine",
          redoStringKey: "V3.Redo.graph.adjustMovableLine"
        })
      } else {
        model.setVolatileLine({intercept: newIntercept, slope: newSlope}, instanceKey)
      }
    }
  }, [getEquationString, instanceKey, interceptLocked, lineObject.lower, lineObject.upper, model,
      newSlopeAndIntercept, updateLine, xAxis, yAxis])

  const handleMoveEquation = useCallback((
    event: { x: number, y: number, dx: number, dy: number },
    isFinished=false
  ) => {
    if (event.dx !== 0 || event.dy !== 0 || isFinished) {
      const equationContainer = select<HTMLDivElement, unknown>(equationContainerSelector)
      const equation = select<HTMLParagraphElement, unknown>(`${equationContainerSelector} p`)
      const equationBounds = equation.node()?.getBoundingClientRect()
      const equationLeft = equation.style("left") ? parseFloat(equation.style("left")) : 0
      const equationTop = equation.style("top") ? parseFloat(equation.style("top")) : 0
      if (equationBounds && equationLeft && equationTop) {
        const left = equationLeft + event.dx
        const top = equationTop + event.dy
        equation.style("left", `${left}px`)
          .style("top", `${top}px`)

        const containerBounds = equationContainer.node()?.getBoundingClientRect()
        if (containerBounds && isFinished) {
          const lineInstance = model.lines.get(instanceKey)
          // compute proportional position of center of label within container
          const x = (left + equationBounds.width / 2) / containerBounds.width
          const y = (top + equationBounds.height / 2) / containerBounds.height
          model.applyModelChange(
            () => lineInstance?.setEquationCoords({ x, y }),
            {
              undoStringKey: "DG.Undo.graph.repositionEquation",
              redoStringKey: "DG.Redo.graph.repositionEquation",
              log: logFn.current
            }
          )
        }
      }
    }
  }, [equationContainerSelector, instanceKey, model])

  // Refresh the line
  useEffect(function refresh() {
    return mstAutorun(() => {
      const lineModel = model.lines.get(instanceKey)
      if (!lineObject.line || !lineModel) return

      const { slope, intercept: _intercept } = lineModel.slopeAndIntercept
      const intercept = interceptLocked ? 0 : _intercept
      const { xDomain, yDomain } = getAxisDomains(xAxis, yAxis)
      pointsOnAxes.current = lineToAxisIntercepts(slope, intercept, xDomain, yDomain)
      updateLine()
      refreshEquation(slope, intercept)

      // Update scale copy ranges
      xScaleRef.current = xScale.copy()
      yScaleRef.current = yScale.copy()
      xScaleRef.current.range([0, plotWidth])
      yScaleRef.current.range([plotHeight, 0])
    }, { name: "MovableLineAdornmentComponent.refreshLine" }, model)
  }, [instanceId, interceptLocked, pointsOnAxes, lineObject, plotHeight, plotWidth, model,
      model.lines, xAttrName, xSubAxesCount, xAxis, yAttrName, xScale, ySubAxesCount, yAxis, xRange,
      yRange, yScale, equationContainerSelector, cellKey, instanceKey, updateLine, refreshEquation])

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
        .on("end", (e) => handleRotation(e, "upper", true)),
      equation: drag()
        .on("drag", (e) => {
          // TODO: Seems like this would log continuously during the drag.
          logFn.current = logModelChangeFn(
            "Moved equation from (%@, %@) to (%@, %@)",
            () => safeGetSnapshot(model.lines?.get(instanceKey)?.equationCoords) ?? { x: "default", y: "default" })
          handleMoveEquation(e)
        })
        .on("end", (e) => handleMoveEquation(e, true))
    }

    lineObject.lower?.call(behaviors.lower)
    !interceptLocked && lineObject.middle?.call(behaviors.middle)
    lineObject.upper?.call(behaviors.upper)
    lineObject.equation?.call(behaviors.equation)
  }, [lineObject, handleTranslate, handleRotation, handleMoveEquation, interceptLocked, model.lines, instanceKey])

  // Build the line and its cover segments and handles just once
  useEffect(function createElements() {
    const selection = select(lineRef.current)
    const newLineObject: ILine = {}

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
      .attr("data-testid", "movable-line-lower-handle")
    newLineObject.handleMiddle = selection.append("rect")
      .attr("class", "movable-line-handle movable-line-middle-handle show-on-tile-selected")
      .attr("data-testid", "movable-line-middle-handle")
    newLineObject.handleUpper = selection.append("rect")
      .attr("class", "movable-line-handle movable-line-upper-handle show-on-tile-selected")
      .attr("data-testid", "movable-line-upper-handle")

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
      .on("mouseover", () => { newLineObject.line?.style("stroke-width", 2) })
      .on("mouseout", () => { newLineObject.line?.style("stroke-width", 1) })

    // If the equation is not pinned to the line, set its initial coordinates to the values specified in the model.
    const lineInstance = model.lines?.get(instanceKey)
    lineInstance?.setExtents({ plotWidth, plotHeight })
    const labelPos = lineInstance?.labelPosition
    if (labelPos) {
      equationP
        .style("left", `${labelPos.left}px`)
        .style("top", `${labelPos.top}px`)
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
