import React, { useCallback, useEffect, useRef, useState } from "react"
import {drag, select} from "d3"
import {tip as d3tip} from "d3-v6-tip"
import { observer } from "mobx-react-lite"
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

interface IProps {
  containerId: string
  instanceKey?: string
  model: IMovablePointModel
  plotHeight: number
  plotIndex: number
  plotWidth: number
  xAxis: INumericAxisModel
  yAxis: INumericAxisModel
}

export const MovablePoint = observer(function MovablePoint(props: IProps) {
  const {instanceKey = '', model, plotHeight, plotWidth, xAxis, yAxis} = props,
    dataConfig = useDataConfigurationContext(),
    layout = useAxisLayoutContext(),
    xScale = layout.getAxisScale("bottom") as ScaleNumericBaseType,
    yScale = layout.getAxisScale("left") as ScaleNumericBaseType,
    graphHeight = layout.getAxisLength('left'),
    graphWidth = layout.getAxisLength('bottom'),
    xSubAxesCount = layout.getAxisMultiScale('bottom')?.repetitions ?? 1,
    ySubAxesCount = layout.getAxisMultiScale('left')?.repetitions ?? 1,
    xDomain = xAxis.domain,
    yDomain = yAxis.domain,
    classFromKey = model.classNameFromKey(instanceKey),
    pointRef = useRef() as React.RefObject<any>,
    [pointObject, setPointObject] = useState<{ [index: string]: any }>({
      point: null, shadow: null, coordinatesBox: null
    })

  // compute initial x and y coordinates
  const [xMin, xMax] = xDomain,
    [yMin, yMax] = yDomain,
    initX = xMax - (xMax - xMin) / 4,
    initY = yMax - (yMax - yMin) / 4

  // get attributes for use in coordinates box and for determining when to reset the point
  // to the initial position when the attributes have changed
  const allAttributes = dataConfig?.dataset?.attributes,
    xAttrId = dataConfig?.attributeID('x') || '',
    yAttrId = dataConfig?.attributeID('y') || '',
    xAttr = allAttributes?.find(attr => attr.id === xAttrId),
    yAttr = allAttributes?.find(attr => attr.id === yAttrId),
    xAttrName = xAttr?.name ?? '',
    yAttrName = yAttr?.name ?? '',
    xAttrNameRef = useRef(xAttrName),
    yAttrNameRef = useRef(yAttrName)

  const showCoordinates = useCallback((event: MouseEvent) => {
    const xValue = model.points.get(instanceKey)?.x ?? 0,
      yValue = model.points.get(instanceKey)?.y ?? 0,
      string = `${xAttrName}: ${xValue}<br />${yAttrName}: ${yValue}`

    dataTip.show(string, event.target)
  }, [instanceKey, model.points, xAttrName, yAttrName])

  const hideCoordinates = useCallback(() => {
    select(`.point-${classFromKey}`)
      .classed('dragging', false)
    dataTip.hide()
  }, [classFromKey])

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
  }, [classFromKey, instanceKey, model, movePoint, plotHeight, plotWidth,
      xAttrName, xScale, xSubAxesCount, yAttrName, yScale, ySubAxesCount])

  useEffect(function repositionPoint() {
    // if attributes have changed, reset the point to the initial position
    if (xAttrName !== xAttrNameRef.current || yAttrName !== yAttrNameRef.current) {
      model.setPoint({x: initX, y: initY}, instanceKey)
      xAttrNameRef.current = xAttrName
      yAttrNameRef.current = yAttrName
    }

    const xValue = model.points.get(instanceKey)?.x ?? 0,
      yValue = model.points.get(instanceKey)?.y ?? 0,
      xPoint = xScale(xValue) / xSubAxesCount,
      yPoint = yScale(yValue) / ySubAxesCount

      movePoint(xPoint, yPoint)
  }, [graphHeight, graphWidth, initX, initY, instanceKey, model, model.points, movePoint,
      xAttrName, xAxis.domain, xScale, xSubAxesCount, yAttrName, yAxis.domain, yScale, ySubAxesCount])

  useEffect(function initializePoint() {
    model.setPoint({x: initX, y: initY}, instanceKey)
    // This effect should only run once on mount, otherwise it can incorrectly
    // set the point's coordinates to the initial values afterward
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Add behaviors to the point
  useEffect(function addBehaviors() {
    pointObject.point?.call(drag().on("drag", handleDragPoint))
  }, [pointObject, handleDragPoint])

  // Set up the point, shadow, and coordinates box
  useEffect(function createElements() {
    const selection = select(pointRef.current),
      newPointObject: any = {}

    newPointObject.shadow = selection.append('circle')
      .attr('cx', xScale(initX) / xSubAxesCount + 1)
      .attr('cy', yScale(initY) / ySubAxesCount + 1)
      .attr('r', 8)
      .attr('fill', 'none')
      .attr('stroke', '#a9a9a9')
      .attr('stroke-width', 2)

    newPointObject.point = selection.append('circle')
      .attr('data-testid', `movable-point`)
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
})
