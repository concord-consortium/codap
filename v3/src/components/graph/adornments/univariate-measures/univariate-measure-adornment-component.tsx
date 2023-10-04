import React, { useCallback, useEffect, useRef } from "react"
import { autorun } from "mobx"
import { drag, select, Selection } from "d3"
import { observer } from "mobx-react-lite"
import { clsx } from "clsx"
import t from "../../../../utilities/translation/translate"
import { IMeasureInstance } from "./univariate-measure-adornment-model"
import { INumericAxisModel } from "../../../axis/models/axis-model"
import { useAxisLayoutContext } from "../../../axis/models/axis-layout-context"
import { ScaleNumericBaseType } from "../../../axis/axis-types"
import { useDataConfigurationContext } from "../../hooks/use-data-configuration-context"
import { valueLabelString } from "../../utilities/graph-utils"
import { Point } from "../../../data-display/data-display-types"
import { useGraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import { IMeanAdornmentModel } from "./mean/mean-adornment-model"
import { IMedianAdornmentModel } from "./median/median-adornment-model"
import { IPlottedValueAdornmentModel, isPlottedValueAdornment } from "./plotted-value/plotted-value-adornment-model"

import "./univariate-measure-adornment-component.scss"

interface IValueObject {
  line?: Selection<SVGLineElement, unknown, null, undefined>
  cover?: Selection<SVGLineElement, unknown, null, undefined>
  text?: Selection<SVGTextElement, unknown, null, undefined>
}

interface ILabelObject {
  label?: Selection<HTMLDivElement, unknown, null, undefined>
}

interface IProps {
  cellKey: Record<string, string>
  containerId?: string
  model: IMeanAdornmentModel | IMedianAdornmentModel | IPlottedValueAdornmentModel
  plotHeight: number
  plotWidth: number
  xAxis: INumericAxisModel
  yAxis: INumericAxisModel
}

export const UnivariateMeasureAdornmentComponent = observer(
  function UnivariateMeasureAdornmentComponent (props: IProps) {
    const {cellKey={}, containerId, model, plotWidth, xAxis, yAxis} = props
    const layout = useAxisLayoutContext()
    const graphModel = useGraphContentModelContext()
    const dataConfig = useDataConfigurationContext()
    const adornmentsStore = graphModel.adornmentsStore
    const measureType = model.type.toLowerCase().replace(" ", "-")
    const showLabel = adornmentsStore?.showMeasureLabels
    const xScale = layout.getAxisScale("bottom") as ScaleNumericBaseType
    const xAttrType = dataConfig?.attributeType("x")
    const yScale = layout.getAxisScale("left") as ScaleNumericBaseType
    const yAttrType = dataConfig?.attributeType("y")
    const instanceKey = model.instanceKey(cellKey)
    const classFromKey = model.classNameFromKey(cellKey)
    const valueRef = useRef<SVGGElement>(null)
    const labelRef = useRef<HTMLDivElement>(null)
    const isVertical = useRef(!!(xAttrType && xAttrType === "numeric"))

    const highlightCover = useCallback((lineId: string, highlight: boolean) => {
      const label = select(`#${lineId}`)
      label.classed("highlighted", highlight)
    }, [])

    const highlightLabel = useCallback((labelId: string, highlight: boolean) => {
      const label = select(`#${labelId}`)
      label.classed("highlighted", highlight)
    }, [])

    const handleMoveLabel = useCallback((event: { x: number, y: number, dx: number, dy: number }, labelId: string) => {
      if (event.dx !== 0 || event.dy !== 0) {
        const label = select(`#${labelId}`)
        const labelNode = label.node() as Element
        const labelWidth = labelNode?.getBoundingClientRect().width || 0
        const labelHeight = labelNode?.getBoundingClientRect().height || 0
        const left = event.x - labelWidth / 2
        const top = event.y - labelHeight / 2

        label.style('left', `${left}px`)
          .style('top', `${top}px`)
      }
    }, [])

    const handleEndMoveLabel = useCallback((event: Point, labelId: string) => {
      const { measures } = model
      const label = select(`#${labelId}`)
      const labelNode = label.node() as Element
      const labelWidth = labelNode?.getBoundingClientRect().width || 0
      const labelHeight = labelNode?.getBoundingClientRect().height || 0
      const x = event.x - labelWidth / 2
      const y = event.y - labelHeight / 2

      const measure = measures.get(instanceKey)
      measure?.setLabelCoords({x, y})
    }, [instanceKey, model])

    const addLineCoverAndLabel = useCallback((
      valueObj: IValueObject, labelObj: ILabelObject, measure: IMeasureInstance
    ) => {
      const attrId = dataConfig?.primaryAttributeID
      const value = attrId ? model.measureValue(attrId, cellKey, dataConfig) : undefined
      if (value === undefined || isNaN(value)) return

      const multiScale = isVertical.current ? layout.getAxisMultiScale("bottom") : layout.getAxisMultiScale("left")
      const displayValue = multiScale ? multiScale.formatValueForScale(value) : valueLabelString(value)
      const plotValue = Number(displayValue)
      const [left, right] = xScale?.range() || [0, 1]
      const [bottom, top] = yScale?.range() || [0, 1]
      const xSubAxesCount = layout.getAxisMultiScale("bottom")?.repetitions ?? 1
      const ySubAxesCount = layout.getAxisMultiScale("left")?.repetitions ?? 1
      const xCatSet = layout.getAxisMultiScale("bottom")?.categorySet
      const xCats = xAttrType === "categorical" && xCatSet ? Array.from(xCatSet.values) : [""]
      const yCatSet = layout.getAxisMultiScale("left")?.categorySet
      const yCats = yAttrType === "categorical" && yCatSet ? Array.from(yCatSet.values) : [""]
      const xCellCount = xCats.length * xSubAxesCount
      const yCellCount = yCats.length * ySubAxesCount
      const x1 = isVertical.current ? xScale(plotValue) / xCellCount : right / xCellCount
      const x2 = isVertical.current ? xScale(plotValue) / xCellCount : left / xCellCount
      const y1 = isVertical.current ? top / yCellCount : yScale(plotValue) / yCellCount
      const y2 = isVertical.current ? bottom / yCellCount : yScale(plotValue) / yCellCount

      const selection = select(valueRef.current)
      const labelSelection = select(labelRef.current)
      const lineId = `${measureType}-line-${containerId}${classFromKey ? `-${classFromKey}` : ""}`
      const lineClass = clsx("measure-line", `${measureType}-line`)
      const coverId = `${measureType}-cover-${containerId}${classFromKey ? `-${classFromKey}` : ""}`
      const coverClass = clsx("measure-cover", `${measureType}-cover`)
      const textContent = `${t(model.labelTitle, { vars: [displayValue]})}`

      valueObj.line = selection.append("line")
        .attr("class", lineClass)
        .attr("id", lineId)
        .attr("data-testid", lineId)
        .attr("x1", x1)
        .attr("x2", x2)
        .attr("y1", y1)
        .attr("y2", y2)

      valueObj.cover = selection.append("line")
        .attr("class", coverClass)
        .attr("id", coverId)
        .attr("data-testid", coverId)
        .attr("x1", x1)
        .attr("x2", x2)
        .attr("y1", y1)
        .attr("y2", y2)

      if (showLabel) {
        const labelCoords = measure.labelCoords
        const activeUnivariateMeasures = adornmentsStore?.activeUnivariateMeasures
        const adornmentIndex = activeUnivariateMeasures?.indexOf(model) ?? null
        const topOffset = activeUnivariateMeasures.length > 1 ? adornmentIndex * 20 : 0
        const labelLeft = labelCoords
          ? labelCoords.x / xCellCount
          : isVertical.current
            ? xScale(plotValue) / xCellCount : 0
        const labelTop = labelCoords ? labelCoords.y : topOffset
        const labelId = `${measureType}-measure-labels-tip-${containerId}${classFromKey ? `-${classFromKey}` : ""}`
        const labelClass = clsx("measure-labels-tip", `measure-labels-tip-${measureType}`)
        labelObj.label = labelSelection.append("div")
          .text(textContent)
          .attr("id", labelId)
          .attr("class", labelClass)
          .attr("data-testid", labelId)
          .style("left", `${labelLeft}px`)
          .style("top", `${labelTop}px`)

        labelObj.label.call(
          drag<HTMLDivElement, unknown>()
            .on("drag", (e) => handleMoveLabel(e, labelId))
            .on("end", (e) => handleEndMoveLabel(e, labelId))
        )

        valueObj.cover.on("mouseover", (e) => highlightLabel(labelId, true))
          .on("mouseout", (e) => highlightLabel(labelId, false))

        labelObj.label.on("mouseover", (e) => highlightCover(coverId, true))
          .on("mouseout", (e) => highlightCover(coverId, false))
      } else {
        const x = isVertical.current ? xScale(plotValue) + 5 : plotWidth - (plotWidth/2)
        const y = isVertical.current ? 50 : yScale(plotValue) - 5
        const textId = `${measureType}-tip-${containerId}${classFromKey ? `-${classFromKey}` : ""}`
        const textClass = clsx("measure-tip", `${measureType}-tip`)
        valueObj.text = selection.append("text")
          .text(textContent)
          .attr("id", textId)
          .attr("class", textClass)
          .attr("data-testid", textId)
          .attr("x", x / xCellCount)
          .attr("y", y / yCellCount)
      }

    }, [adornmentsStore?.activeUnivariateMeasures, cellKey, classFromKey, containerId, dataConfig,
        handleEndMoveLabel, handleMoveLabel, highlightCover, highlightLabel, layout, measureType, model,
        plotWidth, showLabel, xAttrType, xScale, yAttrType, yScale])

    // Add the lines and their associated covers and labels
    const refreshValues = useCallback(() => {
      const { isVisible } = model
      if (!isVisible) return

      const measure = model?.measures.get(instanceKey)
      const newValueObj: IValueObject = {}
      const newLabelObj: ILabelObject = {}
      const selection = select(valueRef.current)
      const labelSelection = select(labelRef.current)

      // Remove the previous value's elements
      selection.html(null)
      labelSelection.html(null)

      if (measure) {
        addLineCoverAndLabel(newValueObj, newLabelObj, measure)
      }
    }, [model, instanceKey, addLineCoverAndLabel])

    // Refresh values on Plotted Value expression changes
    useEffect(function refreshExpressionChange() {
      return autorun(() => {
        // The next line should not be needed, but without it this autorun doesn't get triggered.
        // TODO: Figure out exactly why this is needed and adjust accordingly.
        const modelValue = isPlottedValueAdornment(model) ? model.expression : undefined
        model.updateCategories(graphModel.getUpdateCategoriesOptions())
      })
    }, [graphModel, model])

    // Refresh values on axis changes
    useEffect(function refreshAxisChange() {
      return autorun(() => {
        // We observe changes to the axis domains within the autorun by extracting them from the axes below.
        // We do this instead of including domains in the useEffect dependency array to prevent domain changes
        // from triggering a reinstall of the autorun.
        const { domain: xDomain } = xAxis // eslint-disable-line @typescript-eslint/no-unused-vars
        const { domain: yDomain } = yAxis // eslint-disable-line @typescript-eslint/no-unused-vars
        isVertical.current = dataConfig?.attributeType("x") === "numeric"
        refreshValues()
      }, { name: "UnivariateMeasureAdornmentComponent.refreshAxisChange" })
    }, [dataConfig, refreshValues, xAxis, yAxis])

    return (
      <>
        <div className="measure-container" id={`${measureType}-${containerId}`}>
            <svg
              className={`${measureType}-${classFromKey}`}
              data-testid={`${measureType}-${classFromKey}`}
              style={{height: "100%", width: "100%"}}
              x={0}
              y={0}
            >
              <g>
                <g className={`${measureType}`} ref={valueRef}/>
              </g>
            </svg>
          {
            showLabel &&
              <div className="measure-labels" id={`measure-labels-${containerId}`} ref={labelRef} />
          }
        </div>
      </>
    )
  }
)
