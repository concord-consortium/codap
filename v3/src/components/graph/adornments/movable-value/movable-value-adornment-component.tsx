import {drag, select, Selection} from "d3"
import {autorun} from "mobx"
import { observer } from "mobx-react-lite"
import React, {useCallback, useEffect, useRef} from "react"
import { logMessageWithReplacement } from "../../../../lib/log-message"
import {useAxisLayoutContext} from "../../../axis/models/axis-layout-context"
import { useAdornmentAttributes } from "../../hooks/use-adornment-attributes"
import { useAdornmentCells } from "../../hooks/use-adornment-cells"
import { useGraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import { useGraphDataConfigurationContext } from "../../hooks/use-graph-data-configuration-context"
import {valueLabelString} from "../../utilities/graph-utils"
import { IAdornmentComponentProps } from "../adornment-component-info"
import { getAxisDomains } from "../utilities/adornment-utils"
import { IMovableValueAdornmentModel } from "./movable-value-adornment-model"

import "./movable-value-adornment-component.scss"

interface IValueObject {
  cover?: Selection<SVGLineElement, unknown, null, undefined>
  line?: Selection<SVGLineElement, unknown, null, undefined>
  rect?: Selection<SVGRectElement, unknown, null, undefined>
  valueLabel?: Selection<HTMLDivElement, unknown, HTMLElement, any>
}
export const MovableValueAdornment = observer(function MovableValueAdornment(props: IAdornmentComponentProps) {
  const {containerId, cellKey={}, xAxis, yAxis} = props
  const model = props.model as IMovableValueAdornmentModel
  const layout = useAxisLayoutContext()
  const graphModel = useGraphContentModelContext()
  const dataConfig = useGraphDataConfigurationContext()
  const { xAttrType, xScale, yScale } = useAdornmentAttributes()
  const { cellCounts, classFromKey, instanceKey } = useAdornmentCells(model, cellKey)
  const [left, right] = xScale?.range() || [0, 1]
  const [bottom, top] = yScale?.range() || [0, 1]
  const valueRef = useRef<SVGSVGElement>(null)
  const valueObjects = useRef<IValueObject[]>([])
  const isVertical = useRef(!!(xAttrType && xAttrType === "numeric"))

  const getValues = useCallback(() => {
    const { values } = model
    return values.get(instanceKey)
  }, [instanceKey, model])

  const determineLineCoords = useCallback((value: number) => {
    const offsetRight = 50
    const offsetTop = 20
    const x1 = isVertical.current ? xScale(value) / cellCounts.x : right / cellCounts.x - offsetRight
    const x2 = isVertical.current ? xScale(value) / cellCounts.x : left / cellCounts.x - offsetRight
    const y1 = !isVertical.current ? yScale(value) / cellCounts.y : top / cellCounts.y + offsetTop
    const y2 = !isVertical.current ? yScale(value) / cellCounts.y : bottom / cellCounts.y
    return { x1, x2, y1, y2 }
  }, [bottom, cellCounts, left, right, top, xScale, yScale])

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
          ? xScale(sortedValues[i]) / cellCounts.x
          : yScale(sortedValues[i]) / cellCounts.y
        const fillEnd = isVertical.current ? xScale(nextValue) / cellCounts.x : yScale(nextValue) / cellCounts.y
        const width = isVertical.current ? Math.abs(fillEnd - fillStart) : x1 + 3
        const height = Math.abs(isVertical.current ? y2 - offsetTop : fillEnd - fillStart)
        selection.append("rect")
          .attr("class", `movable-value-fill ${orientationClass}`)
          .attr("x", isVertical.current ? fillStart : 0)
          .attr("y", isVertical.current ? offsetTop : fillEnd)
          .attr("width", width)
          .attr("height", height)
      }
    }
  }, [getValues, containerId, model, instanceKey, determineLineCoords, xScale, yScale, cellCounts.x, cellCounts.y])

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
      ? xScale.invert(event.x) * cellCounts.x
      : yScale.invert(event.y) * cellCounts.y

    // If the value is dragged outside plot area, reset it to its initial value
    if ((preDragValue != null) && (newValue < axisMin || newValue > axisMax)) {
      newValue = preDragValue
    }
    model.updateDrag(newValue, instanceKey, index)
    refreshValue(newValue, index)
  }, [getValues, instanceKey, model, refreshValue, xAttrType, cellCounts, xScale, yScale])

  const handleDragEnd = useCallback(() => {
    const { isDragging, dragIndex, dragValue } = model
    if (isDragging) {
      const logFromValue = model.values.get(instanceKey)?.[dragIndex] !== undefined
                                ? Math.round(model.values.get(instanceKey)![dragIndex] * 10) / 10
                                : 'undefined'
      const logToValue = Math.round(dragValue *10)/10
      graphModel.applyModelChange(
        () => model.endDrag(dragValue, instanceKey, dragIndex),
        { undoStringKey: "DG.Undo.graph.moveMovableValue",
          redoStringKey: "DG.Redo.graph.moveMovableValue",
          log: logMessageWithReplacement("Moved value from %@ to %@", {from: logFromValue, to: logToValue})
        }
      )
    }
  }, [graphModel, instanceKey, model])

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
      getAxisDomains(xAxis, yAxis)
      isVertical.current = dataConfig?.attributeType("x") === "numeric"
      adjustAllValues()
      renderFills()
    }, { name: "MovableValue.refreshAxisChange" })
  }, [adjustAllValues, dataConfig, renderFills, xAxis, yAxis])

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
          .attr("x", isVertical.current ? x1 - 3 : x1)
          .attr("y", isVertical.current ? y1 : y1 - 3)
        newValueObject.line = selection.append("line")
          .attr("class", `movable-value ${orientationClass}`)
          .attr("x1", x1)
          .attr("y1", y1)
          .attr("x2", x2)
          .attr("y2", y2)
        newValueObject.cover = selection.append("line")
          .attr("class", `movable-value-cover ${orientationClass}`)
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
  }, [addDragHandlers, containerId, determineLineCoords, getValues, layout, renderFills])

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
