import { useCallback, useEffect, useRef, useState } from "react"
import {drag, select, Selection} from "d3"
import {tip as d3tip} from "d3-v6-tip"
import { autorun } from "mobx"
import { observer } from "mobx-react-lite"
import { logMessageWithReplacement } from "../../../../lib/log-message"
import { IAdornmentComponentProps } from "../adornment-component-info"
import { IMovablePointAdornmentModel } from "./movable-point-adornment-model"
import { useGraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import { useAdornmentAttributes } from "../../hooks/use-adornment-attributes"
import { useAdornmentCategories } from "../../hooks/use-adornment-categories"
import { useAdornmentCells } from "../../hooks/use-adornment-cells"

import "./movable-point-adornment-component.scss"

const dataTip = d3tip().attr('class', 'graph-d3-tip')
  .attr('data-testid', 'graph-movable-point-data-tip')
  .html((d: string) => {
    return `<p>${d}</p>`
  })

interface IPointObject {
  point?: Selection<SVGCircleElement, unknown, null, undefined>
  shadow?: Selection<SVGCircleElement, unknown, null, undefined>
}

export const MovablePointAdornment = observer(function MovablePointAdornment(props: IAdornmentComponentProps) {
  const {plotHeight, plotWidth, cellKey = {}, xAxis, yAxis} = props
  const model = props.model as IMovablePointAdornmentModel
  const graphModel = useGraphContentModelContext()
  const { xAttrId, yAttrId, xAttrName, yAttrName, xScale, yScale } = useAdornmentAttributes()
  const { classFromKey, instanceKey } = useAdornmentCells(model, cellKey)
  const { xSubAxesCount, ySubAxesCount } = useAdornmentCategories()
  const pointRef = useRef<SVGGElement | null>(null)
  const [pointObject, setPointObject] = useState<IPointObject>({})
  const dragStartPoint = useRef({x: 0, y: 0})

  // Set up refs for determining when attributes have changed and the point needs to be reset
  // to the initial position
  const prevXAttrIdRef = useRef<string>(xAttrId)
  const prevYAttrIdRef = useRef<string>(yAttrId)

  const showCoordinates = useCallback((event: MouseEvent) => {
    const xValue = model.points.get(instanceKey)?.x ?? 0,
      yValue = model.points.get(instanceKey)?.y ?? 0,
      dataTipContent = `${xAttrName}: ${xValue}<br />${yAttrName}: ${yValue}`

    dataTip.show(dataTipContent, event.target)
  }, [instanceKey, model.points, xAttrName, yAttrName])

  const hideCoordinates = useCallback(() => {
    select(`.point-${classFromKey}`)
      .classed('dragging', false)
    dataTip.hide()
  }, [classFromKey])

  const movePoint = useCallback((xPoint: number, yPoint: number) => {
    if (!pointObject.point || !pointObject.shadow) return
    pointObject.point
      .attr('cx', xPoint)
      .attr('cy', yPoint)
    pointObject.shadow
      .attr('cx', xPoint + 1)
      .attr('cy', yPoint + 1)
  }, [pointObject.point, pointObject.shadow])

  const handleDragStart = useCallback((event: MouseEvent) => {
    const { x: xPoint, y: yPoint } = event
    dragStartPoint.current = {x: Math.round(xScale.invert(xPoint * xSubAxesCount)*10)/10,
                              y: Math.round(yScale.invert(yPoint * ySubAxesCount)*10)/10}
  }, [xScale, xSubAxesCount, yScale, ySubAxesCount])

  const handleDrag = useCallback((event: MouseEvent) => {
    const { x: xPoint, y: yPoint } = event
    // don't allow point to be dragged outside plot area
    if (xPoint < 0 || xPoint > plotWidth || yPoint < 0 || yPoint > plotHeight) return

    const xValue = Math.round(xScale.invert(xPoint * xSubAxesCount) * 10) / 10,
      yValue = Math.round(yScale.invert(yPoint * ySubAxesCount) * 10) / 10,
      string = `${xAttrName}: ${xValue}<br />${yAttrName}: ${yValue}`

    select(`.point-${classFromKey}`)
      .classed('dragging', true)
    dataTip.show(string, event.target)
    movePoint(xPoint, yPoint)
  }, [classFromKey, movePoint, plotHeight, plotWidth, xAttrName, xScale, xSubAxesCount,
      yAttrName, yScale, ySubAxesCount])

  const handleDragEnd = useCallback((event: MouseEvent) => {
    const { x: xPoint, y: yPoint } = event
    const xValue = Math.round(xScale.invert(xPoint * xSubAxesCount) * 10) / 10
    const yValue = Math.round(yScale.invert(yPoint * ySubAxesCount) * 10) / 10

    graphModel.applyModelChange(
      () => model.setPoint({x: xValue, y: yValue}, instanceKey),
      {
        undoStringKey: "DG.Undo.graph.moveMovablePoint",
        redoStringKey: "DG.Redo.graph.moveMovablePoint",
        log: logMessageWithReplacement(
              "Move point from (%@, %@) to (%@, %@)",
              { xInitial: dragStartPoint.current.x, yInitial: dragStartPoint.current.y, x: xValue, y: yValue})
      }
    )

  }, [graphModel, instanceKey, model, xScale, xSubAxesCount, yScale, ySubAxesCount])

  useEffect(function repositionPoint() {
    return autorun(() => {
      // if attributes have changed, reset the point to the initial position
      if (xAttrId !== prevXAttrIdRef.current || yAttrId !== prevYAttrIdRef.current) {
        prevXAttrIdRef.current = xAttrId
        prevYAttrIdRef.current = yAttrId
        model.setInitialPoint(xAxis, yAxis, instanceKey)
      }

      const xValue = model.points.get(instanceKey)?.x ?? 0,
        yValue = model.points.get(instanceKey)?.y ?? 0,
        xPoint = xScale(xValue) / xSubAxesCount,
        yPoint = yScale(yValue) / ySubAxesCount

      movePoint(xPoint, yPoint)
    })
  }, [plotHeight, plotWidth, instanceKey, model, model.points, movePoint, xAttrId, xAttrName,
      xAxis, xAxis?.domain, xScale, xSubAxesCount, yAttrId, yAttrName, yAxis, yAxis?.domain,
      yScale, ySubAxesCount])

  // Add behaviors to the point
  useEffect(function addBehaviors() {
    pointObject.point?.on('mouseover', showCoordinates)
      .on('mouseout', hideCoordinates)
      .call(dataTip)
      .call(
        drag<SVGCircleElement, unknown>()
          .on("start", handleDragStart)
          .on("drag", handleDrag)
          .on("end", handleDragEnd)
      )
  }, [pointObject, handleDrag, handleDragEnd, showCoordinates, hideCoordinates, handleDragStart])

  // Set up the point and shadow
  useEffect(function createElements() {
    const selection = select(pointRef.current),
      // Note that we don't set cx and cy here because during restore the scales are not ready to return
      // valid values. Plus, movePoint will be called to set the position of the point.
      newPointObject: IPointObject = {
        shadow: selection.append('circle')
                  .attr('r', 8)
                  .attr('fill', 'none')
                  .attr('stroke', '#a9a9a9')
                  .attr('stroke-width', 2),
        point: selection.append('circle')
                  .attr('data-testid', `movable-point${classFromKey ? `-${classFromKey}` : ""}`)
                  .attr('r', 8)
                  .attr('fill', '#ffff00')
                  .attr('stroke', '#000000')
      }
    setPointObject(newPointObject)

  // This effect should only run once on mount, otherwise it would create multiple
  // instances of the point elements
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <svg
      className={`point-${classFromKey}`}
      style={{height: "100%", width: "100%"}}
      x={0}
      y={0}
    >
      <g>
        <g className={`movable-point movable-point-${classFromKey}`} ref={pointRef} />
      </g>
    </svg>
  )
})
