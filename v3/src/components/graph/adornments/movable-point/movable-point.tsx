import React, { useCallback, useEffect, useRef, useState } from "react"
import {drag, select, Selection} from "d3"
import {tip as d3tip} from "d3-v6-tip"
import { autorun } from "mobx"
import { observer } from "mobx-react-lite"
import { INumericAxisModel } from "../../../axis/models/axis-model"
import { useDataConfigurationContext } from "../../hooks/use-data-configuration-context"
import { useAxisLayoutContext } from "../../../axis/models/axis-layout-context"
import { ScaleNumericBaseType } from "../../../axis/axis-types"
import { IMovablePointModel } from "./movable-point-model"

import "./movable-point.scss"

const dataTip = d3tip().attr('class', 'graph-d3-tip')
  .attr('data-testid', 'graph-movable-point-data-tip')
  .html((d: string) => {
    return `<p>${d}</p>`
  })

interface IPointObject {
  point?: Selection<SVGCircleElement, unknown, null, undefined>
  shadow?: Selection<SVGCircleElement, unknown, null, undefined>
}

interface IProps {
  containerId?: string
  model: IMovablePointModel
  plotHeight: number
  plotWidth: number
  subPlotKey: Record<string, string>
  xAxis?: INumericAxisModel
  yAxis?: INumericAxisModel
}

export const MovablePoint = observer(function MovablePoint(props: IProps) {
  const {model, plotHeight, plotWidth, subPlotKey = {}, xAxis, yAxis} = props,
    dataConfig = useDataConfigurationContext(),
    layout = useAxisLayoutContext(),
    xScale = layout.getAxisScale("bottom") as ScaleNumericBaseType,
    yScale = layout.getAxisScale("left") as ScaleNumericBaseType,
    graphHeight = layout.getAxisLength('left'),
    graphWidth = layout.getAxisLength('bottom'),
    xSubAxesCount = layout.getAxisMultiScale('bottom')?.repetitions ?? 1,
    ySubAxesCount = layout.getAxisMultiScale('left')?.repetitions ?? 1,
    classFromKey = model.classNameFromKey(subPlotKey),
    instanceKey = model.instanceKey(subPlotKey),
    pointRef = useRef<SVGGElement | null>(null),
    [pointObject, setPointObject] = useState<IPointObject>({})

  // get attributes for use in coordinates box and for determining when to reset the point
  // to the initial position when the attributes have changed
  const allAttributes = dataConfig?.dataset?.attributes,
    xAttrId = dataConfig?.attributeID('x') || '',
    yAttrId = dataConfig?.attributeID('y') || '',
    xAttr = allAttributes?.find(attr => attr.id === xAttrId),
    yAttr = allAttributes?.find(attr => attr.id === yAttrId),
    xAttrName = xAttr?.name ?? '',
    yAttrName = yAttr?.name ?? '',
    prevXAttrIdRef = useRef<string>(xAttrId),
    prevYAttrIdRef = useRef<string>(yAttrId)

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

  const handleDragPoint = useCallback((event: MouseEvent) => {
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
    model.setPoint({x: xValue, y: yValue}, instanceKey)
  }, [classFromKey, instanceKey, model, movePoint, plotHeight, plotWidth, xAttrName,
      xScale, xSubAxesCount, yAttrName, yScale, ySubAxesCount])

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
  }, [graphHeight, graphWidth, instanceKey, model, model.points, movePoint, xAttrId, xAttrName,
      xAxis, xAxis?.domain, xScale, xSubAxesCount, yAttrId, yAttrName, yAxis, yAxis?.domain,
      yScale, ySubAxesCount])

  // Add behaviors to the point
  useEffect(function addBehaviors() {
    pointObject.point?.on('mouseover', showCoordinates)
      .on('mouseout', hideCoordinates)
      .call(dataTip)
      .call(drag<SVGCircleElement, unknown>().on("drag", handleDragPoint))
  }, [pointObject, handleDragPoint, showCoordinates, hideCoordinates])

  // Set up the point and shadow
  useEffect(function createElements() {
    const selection = select(pointRef.current),
      { x, y } = model.points.get(instanceKey) ??
                  { x: model.getInitialPosition(xAxis), y: model.getInitialPosition(yAxis) },
      newPointObject: IPointObject = {
        shadow: selection.append('circle')
                  .attr('cx', xScale(x) / xSubAxesCount + 1)
                  .attr('cy', yScale(y) / ySubAxesCount + 1)
                  .attr('r', 8)
                  .attr('fill', 'none')
                  .attr('stroke', '#a9a9a9')
                  .attr('stroke-width', 2),
        point: selection.append('circle')
                  .attr('data-testid', `movable-point${classFromKey ? `-${classFromKey}` : ""}`)
                  .attr('cx', xScale(x) / xSubAxesCount)
                  .attr('cy', yScale(y) / ySubAxesCount)
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
      style={{height: `${plotHeight}px`, width: `${plotWidth}px`}}
      x={0}
      y={0}
    >
      <g>
        <g className={`movable-point movable-point-${classFromKey}`} ref={pointRef} />
      </g>
    </svg>
  )
})
