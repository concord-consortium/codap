import React, { useCallback, useEffect, useRef, useState } from "react"
import {drag, select} from "d3"
import {tip as d3tip} from "d3-v6-tip"
import { IMovablePointModel } from "../adornment-models"
import { INumericAxisModel } from "../../../axis/models/axis-model"
import { useDataConfigurationContext } from "../../hooks/use-data-configuration-context"
import { useAxisLayoutContext } from "../../../axis/models/axis-layout-context"
import { ScaleNumericBaseType } from "../../../axis/axis-types"

import "./movable-point.scss"

const dataTip = d3tip().attr('class', 'graph-d3-tip')
  .attr('data-testid', 'graph-movable-point-data-tip')
  .html((d: string) => {
    return `<p>${d}</p>`
  })

export const MovablePoint = (props: {
  instanceKey?: string
  model: IMovablePointModel
  plotHeight: number
  plotIndex: number
  plotWidth: number
  transform?: string
  xAxis: INumericAxisModel
  yAxis: INumericAxisModel
}) => {
  const {instanceKey='', model, plotHeight, plotWidth} = props,
    dataConfig = useDataConfigurationContext(),
    layout = useAxisLayoutContext(),
    xScale = layout.getAxisScale("bottom") as ScaleNumericBaseType,
    yScale = layout.getAxisScale("left") as ScaleNumericBaseType,
    graphHeight = layout.getAxisLength('left') ?? 0,
    graphWidth = layout.getAxisLength('bottom') ?? 0,
    xSubAxesCount = layout.getAxisMultiScale('bottom')?.repetitions ?? 1,
    ySubAxesCount = layout.getAxisMultiScale('left')?.repetitions ?? 1,
    classFromKey = model.classNameFromKey(instanceKey),
    pointRef = useRef() as React.RefObject<any>,
    [pointObject, setPointObject] = useState<{ [index: string]: any }>({
      point: null, shadow: null, coordinatesBox: null
    })

  console.log("model", model)

  // compute initial x and y coordinates
  const [xMin, xMax] = xScale.domain(),
    [yMin, yMax] = yScale.domain(),
    initX = xMax - (xMax - xMin) / 4,
    initY = yMax - (yMax - yMin) / 4

  // get attributes for use in coordinates box
  const allAttributes = dataConfig?.dataset?.attributes,
    xAttrId = dataConfig?.attributeID('x') || '',
    yAttrId = dataConfig?.attributeID('y') || '',
    xAttr = allAttributes?.find(attr => attr.id === xAttrId),
    yAttr = allAttributes?.find(attr => attr.id === yAttrId),
    xAttrName = xAttr?.name ?? '',
    yAttrName = yAttr?.name ?? ''

  const showCoordinates = useCallback((event: MouseEvent) => {
    if (!model.points) return
    const xValue = model.points.get(instanceKey)?.x ?? 0,
      yValue = model.points.get(instanceKey)?.y ?? 0,
      string = `${xAttrName}: ${xValue}<br />${yAttrName}: ${yValue}`

    dataTip.show(string, event.target)
  }, [instanceKey, model.points, xAttrName, yAttrName])

  const hideCoordinates = useCallback(() => {
    dataTip.hide()
  }, [])

  const movePoint = useCallback((xPoint: number, yPoint: number) => {
    if (pointObject.point === null) return
    pointObject.point
      .attr('cx', xPoint)
      .attr('cy', yPoint)
    pointObject.shadow
      .attr('cx', xPoint + 1)
      .attr('cy', yPoint + 1)
  }, [pointObject.point, pointObject.shadow])

  const handleDragPoint = useCallback((event: MouseEvent) => {
    const { x: xPoint, y: yPoint } = event,
      xValue = Math.round(xScale.invert(xPoint * xSubAxesCount) * 10) / 10,
      yValue = Math.round(yScale.invert(yPoint * ySubAxesCount) * 10) / 10,
      string = `${xAttrName}: ${xValue}<br />${yAttrName}: ${yValue}`

    dataTip.show(string, event.target)
    movePoint(xPoint, yPoint)
    model.setPoint({x: xValue, y: yValue}, instanceKey)
  }, [instanceKey, model, movePoint, xAttrName, xScale, xSubAxesCount, yAttrName, yScale, ySubAxesCount])

  useEffect(function repositionPoint() {
    if (!model.points) return
    const xValue = model.points.get(instanceKey)?.x ?? 0,
      yValue = model.points.get(instanceKey)?.y ?? 0,
      xPoint = xScale(xValue) / xSubAxesCount,
      yPoint = yScale(yValue) / ySubAxesCount

      movePoint(xPoint, yPoint)
  }, [graphHeight, graphWidth, instanceKey, model.points, movePoint, 
      xScale, xSubAxesCount, yScale, ySubAxesCount])

  // add points that don't already exist in the model
  useEffect(function addPoint() {
    if (!model.points) return
    if (!model.points.has(instanceKey)) {
      model.setPoint({x: initX, y: initY}, instanceKey)
    }
  }, [model, instanceKey, initX, initY])

  // Add behaviors to the point
  useEffect(function addBehaviors() {
    pointObject.point?.call(drag().on("drag", handleDragPoint))
  }, [pointObject, handleDragPoint])

  // Set up the point, shadow, and coordinates box
  useEffect(function createElements() {
    const selection = select(pointRef.current),
      newPointObject: any = {}

    newPointObject.shadow = selection.append('circle')
      .attr('cx', xScale(initX) + 1)
      .attr('cy', yScale(initY) + 1)
      .attr('r', 8)
      .attr('fill', 'none')
      .attr('stroke', '#a9a9a9')
      .attr('stroke-width', 2)

    newPointObject.point = selection.append('circle')
      .attr('cx', xScale(initX) / xSubAxesCount)
      .attr('cy', yScale(initY) / ySubAxesCount)
      .attr('r', 8)
      .attr('fill', '#ffff00')
      .attr('stroke', '#000000')
      .on('mouseover', showCoordinates)
      .on('mouseout', hideCoordinates)
      .call(dataTip)

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
        <g className={`movable-point movable-point-${instanceKey}`} ref={pointRef} />
      </g>
    </svg>
  )
}
