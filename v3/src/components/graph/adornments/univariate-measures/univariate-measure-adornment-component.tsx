import React, { useCallback, useEffect, useRef } from "react"
import { autorun } from "mobx"
import { drag, select, selectAll, Selection } from "d3"
import { observer } from "mobx-react-lite"
import { clsx } from "clsx"
import t from "../../../../utilities/translation/translate"
import { IMeasureInstance, IUnivariateMeasureAdornmentModel } from "./univariate-measure-adornment-model"
import { INumericAxisModel } from "../../../axis/models/axis-model"
import { useAxisLayoutContext } from "../../../axis/models/axis-layout-context"
import { ScaleNumericBaseType } from "../../../axis/axis-types"
import { useGraphDataConfigurationContext } from "../../hooks/use-data-configuration-context"
import { valueLabelString } from "../../utilities/graph-utils"
import { Point } from "../../../data-display/data-display-types"
import { useGraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import { isPlottedValueAdornment } from "./plotted-value/plotted-value-adornment-model"
import { measureText } from "../../../../hooks/use-measure-text"

import "./univariate-measure-adornment-component.scss"

interface IValue {
  line?: Selection<SVGLineElement, unknown, null, undefined>
  cover?: Selection<SVGLineElement, unknown, null, undefined>
  text?: Selection<SVGTextElement, unknown, null, undefined>
  range?: Selection<SVGRectElement, unknown, null, undefined>
  rangeMin?: Selection<SVGLineElement, unknown, null, undefined>
  rangeMax?: Selection<SVGLineElement, unknown, null, undefined>
  rangeMinCover?: Selection<SVGLineElement, unknown, null, undefined>
  rangeMaxCover?: Selection<SVGLineElement, unknown, null, undefined>
}

interface ILineCoords {
  x1: number
  x2: number
  y1: number
  y2: number
}

interface ILabel {
  label?: Selection<HTMLDivElement, unknown, null, undefined>
}

interface IProps {
  cellKey: Record<string, string>
  containerId?: string
  model: IUnivariateMeasureAdornmentModel
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
    const dataConfig = useGraphDataConfigurationContext()
    const adornmentsStore = graphModel.adornmentsStore
    const measureSlug = model.type.toLowerCase().replace(/ /g, "-")
    const showLabel = adornmentsStore?.showMeasureLabels
    const xScale = layout.getAxisScale("bottom") as ScaleNumericBaseType
    const xAttrType = dataConfig?.attributeType("x")
    const yScale = layout.getAxisScale("left") as ScaleNumericBaseType
    const yAttrType = dataConfig?.attributeType("y")
    const xSubAxesCount = layout.getAxisMultiScale("bottom")?.repetitions ?? 1
    const ySubAxesCount = layout.getAxisMultiScale("left")?.repetitions ?? 1
    const xCatSet = layout.getAxisMultiScale("bottom")?.categorySet
    const xCats = xAttrType === "categorical" && xCatSet ? Array.from(xCatSet.values) : [""]
    const yCatSet = layout.getAxisMultiScale("left")?.categorySet
    const yCats = yAttrType === "categorical" && yCatSet ? Array.from(yCatSet.values) : [""]
    const xCellCount = xCats.length * xSubAxesCount
    const yCellCount = yCats.length * ySubAxesCount
    const instanceKey = model.instanceKey(cellKey)
    const classFromKey = model.classNameFromKey(cellKey)
    const valueRef = useRef<SVGGElement>(null)
    const labelRef = useRef<HTMLDivElement>(null)
    const isVertical = useRef(!!(xAttrType && xAttrType === "numeric"))

    const generateIdString = useCallback((elementType: string) => {
      return `${measureSlug}-${elementType}-${containerId}${classFromKey ? `-${classFromKey}` : ""}`
    }, [classFromKey, containerId, measureSlug])

    const highlightCovers = useCallback((highlight: boolean) => {
      const covers = selectAll(`#${measureSlug}-${containerId} .${measureSlug}-cover`)
      covers.classed("highlighted", highlight)
    }, [containerId, measureSlug])

    const toggleTextTip = useCallback((visible: boolean) => {
      const label = select(`#${measureSlug}-${containerId} .${measureSlug}-tip`)
      label.classed("visible", visible)
      highlightCovers(visible)
    }, [containerId, highlightCovers, measureSlug])

    const highlightLabel = useCallback((labelId: string, highlight: boolean) => {
      const label = select(`#${labelId}`)
      label.classed("highlighted", highlight)
      highlightCovers(highlight)
    }, [highlightCovers])

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

    const newLine = useCallback((lineClass: string, lineId: string, coords: ILineCoords) => {
      const selection = select(valueRef.current)
      const { x1, x2, y1, y2 } = coords
      return selection.append("line")
        .attr("class", lineClass)
        .attr("id", lineId)
        .attr("data-testid", lineId)
        .attr("x1", x1)
        .attr("x2", x2)
        .attr("y1", y1)
        .attr("y2", y2)
    }, [])

    const addRange = useCallback((
      range: number, plotValue: number, coverClass: string, lineClass: string, valueObj: IValue, coords: ILineCoords
    ) => {
      if (!dataConfig) return
      const { x1, x2, y1, y2 } = coords
      const selection = select(valueRef.current)
      const rangeId = generateIdString("range")
      const rangeMinId = generateIdString("min")
      const rangeMinCoverId = generateIdString("min-cover")
      const rangeMaxId = generateIdString("max")
      const rangeMaxCoverId = generateIdString("max-cover")
      const rangeMinX1 = isVertical.current ? xScale(plotValue - range) / xCellCount : x1
      const rangeMinX2 = isVertical.current ? xScale(plotValue - range) / xCellCount : x2
      const rangeMinY1 = isVertical.current ? y1 : yScale(plotValue + range) / yCellCount
      const rangeMinY2 = isVertical.current ? y2 : yScale(plotValue + range) / yCellCount
      const rangeMinCoords = { x1: rangeMinX1, x2: rangeMinX2, y1: rangeMinY1, y2: rangeMinY2 }
      const rangeMaxX1 = isVertical.current ? xScale(plotValue + range) / xCellCount : x1
      const rangeMaxX2 = isVertical.current ? xScale(plotValue + range) / xCellCount : x2
      const rangeMaxY1 = isVertical.current ? y1 : yScale(plotValue - range) / yCellCount
      const rangeMaxY2 = isVertical.current ? y2 : yScale(plotValue - range) / yCellCount
      const rangeMaxCoords = { x1: rangeMaxX1, x2: rangeMaxX2, y1: rangeMaxY1, y2: rangeMaxY2 }
  
      // Add the shaded rectangle that covers the range
      valueObj.range = selection.append("rect")
        .attr("class", `measure-range ${measureSlug}-range`)
        .attr("id", rangeId)
        .attr("data-testid", rangeId)
        .attr("x", isVertical.current ? rangeMinX1 : 0)
        .attr("y", isVertical.current ? 0 : rangeMinY1)
        .attr("width", isVertical.current ? rangeMaxX1 - rangeMinX1 : "100%")
        .attr("height", isVertical.current ? "100%" : rangeMaxY1 - rangeMinY1)

      // Add the lines at the range min and max
      valueObj.rangeMin = newLine(`${lineClass} range-line`, rangeMinId, rangeMinCoords)
      valueObj.rangeMinCover = newLine(coverClass, rangeMinCoverId, rangeMinCoords)
      valueObj.rangeMax = newLine(`${lineClass} range-line`, rangeMaxId, rangeMaxCoords)
      valueObj.rangeMaxCover = newLine(coverClass, rangeMaxCoverId, rangeMaxCoords)

      // Add the hover behavior for the min and max lines
      if (showLabel) {
        const labelId = generateIdString("measure-labels-tip")
        valueObj.rangeMinCover.on("mouseover", () => highlightLabel(labelId, true))
          .on("mouseout", () => highlightLabel(labelId, false))
        valueObj.rangeMaxCover.on("mouseover", () => highlightLabel(labelId, true))
          .on("mouseout", () => highlightLabel(labelId, false))
      } else {
        valueObj.rangeMinCover.on("mouseover", () => toggleTextTip(true))
          .on("mouseout", () => toggleTextTip(false))
        valueObj.rangeMaxCover.on("mouseover", () => toggleTextTip(true))
          .on("mouseout", () => toggleTextTip(false))
      }
    }, [dataConfig, generateIdString, xScale, xCellCount, yScale, yCellCount, measureSlug, newLine, showLabel,
        highlightLabel, toggleTextTip])

    const addLabels = useCallback((
      labelObj: ILabel, measure: IMeasureInstance, textContent: string, valueObj: IValue,
      plotValue: number, range?: number
    ) => {
      const labelSelection = select(labelRef.current)
      const labelCoords = measure.labelCoords
      const activeUnivariateMeasures = adornmentsStore?.activeUnivariateMeasures
      const adornmentIndex = activeUnivariateMeasures?.indexOf(model) ?? null
      const labelOffset = 20
      const topOffset = activeUnivariateMeasures.length > 1 ? adornmentIndex * labelOffset : 0
      let labelLeft = labelCoords
        ? labelCoords.x / xCellCount
        : isVertical.current
          ? xScale(plotValue) / xCellCount
          : 0
      if (range && isVertical.current) labelLeft = xScale(plotValue + range) / xCellCount
      const labelTop = labelCoords ? labelCoords.y : topOffset
      const labelId = `${measureSlug}-measure-labels-tip-${containerId}${classFromKey ? `-${classFromKey}` : ""}`
      const labelClass = clsx("measure-labels-tip", `measure-labels-tip-${measureSlug}`)

      labelObj.label = labelSelection.append("div")
        .text(textContent)
        .attr("class", labelClass)
        .attr("id", labelId)
        .attr("data-testid", labelId)
        .style("left", `${labelLeft}px`)
        .style("top", `${labelTop}px`)

      labelObj.label.call(
        drag<HTMLDivElement, unknown>()
          .on("drag", (e) => handleMoveLabel(e, labelId))
          .on("end", (e) => handleEndMoveLabel(e, labelId))
      )

      labelObj.label.on("mouseover", () => highlightCovers(true))
        .on("mouseout", () => highlightCovers(false))

      if (!range && valueObj.cover) {
        valueObj.cover.on("mouseover", () => highlightLabel(labelId, true))
          .on("mouseout", () => highlightLabel(labelId, false))
      }
    }, [adornmentsStore?.activeUnivariateMeasures, classFromKey, containerId, handleEndMoveLabel, handleMoveLabel,
        highlightCovers, highlightLabel, measureSlug, model, xCellCount, xScale])

    const addTextTip = useCallback((plotValue: number, textContent: string, valueObj: IValue, range?: number) => {
      const selection = select(valueRef.current)
      const textId = generateIdString("tip")
      const textClass = clsx("measure-tip", `${measureSlug}-tip`)
      const lineOffset = 5
      const topOffset = 50
      let x = isVertical.current ? xScale(plotValue) / xCellCount + lineOffset : (plotWidth - plotWidth/2) / xCellCount
      if (range && isVertical.current) x = xScale(plotValue + range) / xCellCount + lineOffset
      let y = isVertical.current ? topOffset : yScale(plotValue) / yCellCount - lineOffset
      if (range && !isVertical.current) y = yScale(plotValue + range) / yCellCount - lineOffset

      // If x plus the approximate width of the text tip would extend beyond the right boundary of the subplot, set x to
      // plotWidth minus the text tip width or zero, whichever is greater.
      const textTipWidth = measureText(textContent)
      if (x + textTipWidth > plotWidth) x = Math.max(plotWidth - textTipWidth, 0)

      valueObj.text = selection.append("text")
        .text(textContent)
        .attr("class", textClass)
        .attr("id", textId)
        .attr("data-testid", textId)
        .attr("x", x)
        .attr("y", y)

      if (valueObj.cover) {
        valueObj.cover
          .on("mouseover", () => toggleTextTip(true))
          .on("mouseout", () => toggleTextTip(false))
      }
    }, [generateIdString, measureSlug, plotWidth, toggleTextTip, xCellCount, xScale, yCellCount, yScale])

    const addLineCoverAndLabel = useCallback((valueObj: IValue, labelObj: ILabel, measure: IMeasureInstance) => {
      const xAttrId = dataConfig?.attributeID("x")
      const yAttrId = dataConfig?.attributeID("y")
      const attrId = xAttrId && xAttrType === "numeric" ? xAttrId : yAttrId
      if (!attrId || !dataConfig) return
      const value = model.measureValue(attrId, cellKey, dataConfig)
      if (value === undefined || isNaN(value)) return

      const multiScale = isVertical.current ? layout.getAxisMultiScale("bottom") : layout.getAxisMultiScale("left")
      const displayValue = multiScale?.formatValueForScale(value) || valueLabelString(value)
      const plotValue = Number(displayValue)
      const measureRange = model.hasRange
        ? model.computeMeasureRange(attrId, cellKey, dataConfig)
        : undefined
      const displayRange = measureRange || measureRange === 0
        ? multiScale?.formatValueForScale(measureRange) || valueLabelString(measureRange)
        : undefined
      const range = measureRange && Number(measureRange)
      const [left, right] = xScale?.range() || [0, 1]
      const [bottom, top] = yScale?.range() || [0, 1]
      const x1 = isVertical.current ? xScale(plotValue) / xCellCount : right / xCellCount
      const x2 = isVertical.current ? xScale(plotValue) / xCellCount : left / xCellCount
      const y1 = isVertical.current ? top / yCellCount : yScale(plotValue) / yCellCount
      const y2 = isVertical.current ? bottom / yCellCount : yScale(plotValue) / yCellCount
      const lineClass = clsx("measure-line", `${measureSlug}-line`)
      const lineId = generateIdString("line")
      const coverClass = clsx("measure-cover", `${measureSlug}-cover`)
      const coverId = generateIdString("cover")
      const textContent = `${t(model.labelTitle, { vars: [`${displayRange ? `${displayRange}` : `${displayValue}`}`]})}`

      valueObj.line = newLine(lineClass, lineId, {x1, x2, y1, y2})
      if (range) {
        addRange(range, plotValue, coverClass, lineClass, valueObj, {x1, x2, y1, y2})
      } else {
        // Only add a cover for the value line if the adornment doesn't have a range
        valueObj.cover = newLine(coverClass, coverId, {x1, x2, y1, y2})
      }
      if (showLabel) {
        addLabels(labelObj, measure, textContent, valueObj, plotValue, range)
      } else {
        addTextTip(plotValue, textContent, valueObj, range)
      }
    }, [dataConfig, xAttrType, model, cellKey, layout, xScale, yScale, xCellCount, yCellCount, measureSlug,
        generateIdString, newLine, showLabel, addRange, addLabels, addTextTip])

    // Add the lines and their associated covers and labels
    const refreshValues = useCallback(() => {
      const { isVisible } = model
      if (!isVisible) return

      const measure = model?.measures.get(instanceKey)
      const newValueObj: IValue = {}
      const newLabelObj: ILabel = {}
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const modelValue = isPlottedValueAdornment(model) ? model.expression : undefined
        model.updateCategories(graphModel.getUpdateCategoriesOptions())
      }, { name: "UnivariateMeasureAdornmentComponent.refreshExpressionChange" })
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
        <div className="measure-container" id={`${measureSlug}-${containerId}`}>
            <svg
              className={`${measureSlug}-${classFromKey}`}
              data-testid={`${measureSlug}-${classFromKey}`}
              style={{height: "100%", width: "100%"}}
              x={0}
              y={0}
            >
              <g>
                <g className={`${measureSlug}`} ref={valueRef}/>
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
