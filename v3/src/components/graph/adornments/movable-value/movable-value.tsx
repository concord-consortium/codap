import React, {useCallback, useEffect, useRef} from "react"
import {drag, select, Selection} from "d3"
import {autorun} from "mobx"
import { observer } from "mobx-react-lite"
import {useAxisLayoutContext} from "../../../axis/models/axis-layout-context"
import {ScaleNumericBaseType} from "../../../axis/axis-types"
import {INumericAxisModel} from "../../../axis/models/axis-model"
import {valueLabelString} from "../../utilities/graph-utils"
import { IMovableValueModel } from "./movable-value-model"
import { useDataConfigurationContext } from "../../hooks/use-data-configuration-context"

import "./movable-value.scss"

interface IValueObject {
  cover?: Selection<SVGLineElement, unknown, null, undefined>
  line?: Selection<SVGLineElement, unknown, null, undefined>
  rect?: Selection<SVGRectElement, unknown, null, undefined>
  valueLabel?: Selection<HTMLDivElement, unknown, HTMLElement, any>
}
interface IProps {
  cellKey: Record<string, string>
  containerId: string
  model: IMovableValueModel
  plotHeight: number
  plotWidth: number
  transform: string
  xAxis: INumericAxisModel
  yAxis: INumericAxisModel
}

export const MovableValue = observer(function MovableValue (props: IProps) {
  const {containerId, model, cellKey={}, transform, xAxis, yAxis} = props
  const layout = useAxisLayoutContext(),
    dataConfig = useDataConfigurationContext(),
    xScale = layout.getAxisScale("bottom") as ScaleNumericBaseType,
    yScale = layout.getAxisScale("left") as ScaleNumericBaseType,
    instanceKey = model.instanceKey(cellKey),
    classFromKey = model.classNameFromKey(cellKey),
    [left, right] = xScale?.range() || [0, 1],
    [bottom, top] = yScale?.range() || [0, 1],
    xAttrType = dataConfig?.attributeType("x"),
    yAttrType = dataConfig?.attributeType("y"),
    xSubAxesCount = layout.getAxisMultiScale("bottom")?.repetitions ?? 1,
    ySubAxesCount = layout.getAxisMultiScale("left")?.repetitions ?? 1,
    xCatSet = layout.getAxisMultiScale("bottom")?.categorySet,
    xCats = xAttrType === "categorical" && xCatSet ? Array.from(xCatSet.values) : [""],
    yCatSet = layout.getAxisMultiScale("left")?.categorySet,
    yCats = yAttrType === "categorical" && yCatSet ? Array.from(yCatSet.values) : [""],
    xCellCount = xCats.length * xSubAxesCount,
    yCellCount = yCats.length * ySubAxesCount,
    valueRef = useRef<SVGSVGElement>(null),
    valueObjects = useRef<IValueObject[]>([]),
    isVertical = useRef(!!(xAttrType && xAttrType === "numeric"))

  const getValues = useCallback(() => {
    const { values } = model
    return values.get(instanceKey)
  }, [instanceKey, model])

  const determineLineCoords = useCallback((value: number) => {
    const offsetRight = 50
    const offsetTop = 20
    const x1 = isVertical.current ? xScale(value) / xCellCount : right / xCellCount - offsetRight
    const x2 = isVertical.current ? xScale(value) / xCellCount : left / xCellCount - offsetRight
    const y1 = !isVertical.current ? yScale(value) / yCellCount : top / yCellCount + offsetTop
    const y2 = !isVertical.current ? yScale(value) / yCellCount : bottom / yCellCount
    return { x1, x2, y1, y2 }
  }, [bottom, left, right, top, xCellCount, xScale, yCellCount, yScale])

  const renderFills = useCallback(() => {
    const values = getValues()
    if (!values || values.length < 2) return
    select(`#${containerId}`).selectAll(".movable-value-fill").remove()
    const sortedValues = model.sortedValues(instanceKey)
    const { x1, y1, y2 } = determineLineCoords(values[0])
    const offsetTop = y1 + 3
    const orientationClass: string = isVertical.current ? "vertical" : "horizontal"
    const selection = select(valueRef.current)
    const axisMax = isVertical.current ? xScale.domain()[1] : yScale.domain()[1]

    for (let i = 0; i < sortedValues.length; i++) {
      if (i % 2 === 0) {
        const nextValue = sortedValues[i + 1] ?? axisMax
        const fillStart = isVertical.current
          ? xScale(sortedValues[i]) / xCellCount
          : yScale(sortedValues[i]) / yCellCount
        const fillEnd = isVertical.current ? xScale(nextValue) / xCellCount : yScale(nextValue) / yCellCount
        const width = isVertical.current ? Math.abs(fillEnd - fillStart) : x1 + 3
        const height = isVertical.current ? y2 - offsetTop : Math.abs(fillEnd - fillStart)
        selection.append("rect")
          .attr("class", `movable-value-fill ${orientationClass}`)
          .attr("x", isVertical.current ? fillStart : 0)
          .attr("y", isVertical.current ? offsetTop : fillEnd)
          .attr("width", width)
          .attr("height", height)
      }
    }
  }, [getValues, containerId, model, instanceKey, determineLineCoords, xScale, yScale, xCellCount, yCellCount])

  // Updates the coordinates of the line and its cover segments
  const refreshValue = useCallback((value: number, valueObjIndex: number) => {
    if (!value || !valueObjects.current[valueObjIndex]) return
    const multiScale = isVertical.current ? layout.getAxisMultiScale("bottom") : layout.getAxisMultiScale("left")
    const displayValue = multiScale ? multiScale.formatValueForScale(value) : valueLabelString(value)
    const { line, cover, rect, valueLabel } = valueObjects.current[valueObjIndex]
    if (!line || !cover || !rect || !valueLabel) return

    const { x1, x2, y1, y2 } = determineLineCoords(value)
    const rectOffset = 3
    line.attr("x1", x1)
        .attr("y1", y1)
        .attr("x2", x2)
        .attr("y2", y2)
        .classed("vertical", isVertical.current)
        .classed("horizontal", !isVertical.current)
    cover.attr("x1", isVertical.current ? x1 : x1 + 7)
        .attr("y1", y1)
        .attr("x2", x2)
        .attr("y2", y2)
        .classed("vertical", isVertical.current)
        .classed("horizontal", !isVertical.current)
    rect.attr("x", isVertical.current ? x1 - rectOffset : x1)
        .attr("y", isVertical.current ? y1 : y1 - rectOffset)
        .classed("vertical", isVertical.current)
        .classed("horizontal", !isVertical.current)

    valueLabel
      .style("left", `${x1}px`)
      .style("top", `${y1}px`)
      .classed("vertical", isVertical.current)
      .classed("horizontal", !isVertical.current)
      .html(displayValue)
  }, [determineLineCoords, layout])

  const handleDrag = useCallback((event: MouseEvent, index: number) => {
    const values = getValues()
    const preDragValue = values?.[index]
    const axisMin = isVertical.current ? xScale.domain()[0] : yScale.domain()[0]
    const axisMax = isVertical.current ? xScale.domain()[1] : yScale.domain()[1]
    let newValue = xAttrType === "numeric"
      ? xScale.invert(event.x) * xCellCount
      : yScale.invert(event.y) * yCellCount

    // If the value is dragged outside plot area, reset it to its initial value
    if ((preDragValue != null) && (newValue < axisMin || newValue > axisMax)) {
      newValue = preDragValue
    }
    model.updateDrag(newValue, index, instanceKey)
    refreshValue(newValue, index)
  }, [getValues, instanceKey, model, refreshValue, xAttrType, xCellCount, xScale, yCellCount, yScale])

  const handleDragEnd = useCallback(() => {
    const { isDragging, dragIndex, dragValue } = model
    if (isDragging) {
      model.endDrag(dragValue, instanceKey, dragIndex)
    }
  }, [instanceKey, model])

  // Add drag behaviors to the line cover
  const addDragHandlers = useCallback(() => {
    for (let i = 0; i < valueObjects.current.length; i++) {
      valueObjects.current[i].cover?.call(
        drag<SVGLineElement, unknown, null>()
          .on("drag", (e) => handleDrag(e, i))
          .on("end", () => handleDragEnd())
      )
    }
  }, [handleDrag, handleDragEnd])

  // Forces a refresh of the lines and their cover segments and drag handlers.
  // This is called when a value change is not caused by dragging, e.g. when
  // the value's associated attribute is moved from the bottom to the left axis.
  const adjustAllValues = useCallback(() => {
    const values = getValues()
    if (!values?.length) return
    for (let i = 0; i < valueObjects.current.length; i++) {
      refreshValue(values[i], i)
      const { cover } = valueObjects.current[i]
      cover?.on(".drag", null)
    }
    addDragHandlers()
  }, [addDragHandlers, getValues, refreshValue])

  // Refresh the value when it changes
  useEffect(function refreshValueChange() {
    const { isDragging, dragIndex } = model
    if (!isDragging) {
      adjustAllValues()
    }
    return autorun(function refreshValues() {
      const movableValueInstance = model.values.get(instanceKey)
      movableValueInstance?.[dragIndex] &&
        refreshValue(movableValueInstance?.[dragIndex], dragIndex)
      movableValueInstance?.[dragIndex] && renderFills()
    }, { name: "MovableValue.refreshValues" })
  }, [adjustAllValues, instanceKey, model, model.values, refreshValue, renderFills])

  // Refresh the value when the axis changes
  useEffect(function refreshAxisChange() {
    return autorun(() => {
      isVertical.current = dataConfig?.attributeType("x") === "numeric"
      adjustAllValues()
      renderFills()
    }, { name: "MovableValue.refreshAxisChange" })
  }, [adjustAllValues, dataConfig, renderFills, xAxis.max, xAxis.min, yAxis.max, yAxis.min])

  // Make the movable values and their cover segments
  useEffect(function createElements() {
    return autorun(() => {
      const values = getValues()
      if (!values || valueObjects.current.length === values.length) return

      // Clear any previously added elements
      valueObjects.current = []
      const selection = select(valueRef.current)
      selection.html(null)
      select(`#${containerId}`).selectAll("div").remove()

      for (let i = 0; i < values.length; i++) {
        const newValueObject: IValueObject = {}
        const { x1, x2, y1, y2 } = determineLineCoords(values[i])
        const orientationClass = isVertical.current ? "vertical" : "horizontal"
        const multiScale = isVertical.current ? layout.getAxisMultiScale("bottom") : layout.getAxisMultiScale("left")
        const displayValue = multiScale ? multiScale.formatValueForScale(values[i]) : valueLabelString(values[i])

        newValueObject.rect = selection.append("rect")
          .attr("class", `movable-value-rect ${orientationClass}`)
          .attr("transform", transform)
          .attr("x", isVertical.current ? x1 - 3 : x1)
          .attr("y", isVertical.current ? y1 : y1 - 3)
        newValueObject.line = selection.append("line")
          .attr("class", `movable-value ${orientationClass}`)
          .attr("transform", transform)
          .attr("x1", x1)
          .attr("y1", y1)
          .attr("x2", x2)
          .attr("y2", y2)
        newValueObject.cover = selection.append("line")
          .attr("class", `movable-value-cover ${orientationClass}`)
          .attr("transform", transform)
          .attr("x1", isVertical.current ? x1 : x1 + 7)
          .attr("y1", y1)
          .attr("x2", x2)
          .attr("y2", y2)
        newValueObject.valueLabel = select(`#${containerId}`).append("div")
          .attr("class", `movable-value-label ${orientationClass}`)
          .style("left", `${x1}px`)
          .style("top", `${y1}px`)
          .html(displayValue)

        valueObjects.current = [...valueObjects.current, newValueObject]
        addDragHandlers()
        renderFills()
      }
    }, { name: "MovableValue.createElements" })
  }, [addDragHandlers, containerId, determineLineCoords, getValues, layout, renderFills, transform])

  return (
    <svg
      className={`movable-value-${classFromKey}`}
      data-testid={`movable-value-${classFromKey}`}
      style={{height: `100%`, width: `100%`}}
      x={0}
      y={0}
    >
      <g>
        <g className="movable-value" ref={valueRef}/>
      </g>
    </svg>
  )
})
