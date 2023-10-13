import React, { useCallback, useEffect, useRef } from "react"
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
import { isBoxPlotAdornment } from "./box-plot/box-plot-adornment-model"
import { mstAutorun } from "../../../../utilities/mst-autorun"

import "./univariate-measure-adornment-component.scss"

interface IValue {
  line?: Selection<SVGLineElement, unknown, null, undefined>
  cover?: Selection<SVGLineElement, unknown, null, undefined>
  text?: Selection<SVGTextElement, unknown, null, undefined>
  divText?: Selection<HTMLDivElement, unknown, HTMLElement, undefined>
  range?: Selection<SVGRectElement, unknown, null, undefined>
  rangeMin?: Selection<SVGLineElement, unknown, null, undefined>
  rangeMax?: Selection<SVGLineElement, unknown, null, undefined>
  rangeMinCover?: Selection<SVGLineElement, unknown, null, undefined>
  rangeMaxCover?: Selection<SVGLineElement, unknown, null, undefined>
  whiskerLower?: Selection<SVGLineElement, unknown, null, undefined>
  whiskerLowerCover?: Selection<SVGLineElement, unknown, null, undefined>
  lowerOutliers?: Selection<SVGPathElement, number, SVGGElement | null, unknown>
  lowerOutliersCovers?: Selection<SVGRectElement, number, SVGGElement | null, unknown>
  whiskerUpper?: Selection<SVGLineElement, unknown, null, undefined>
  whiskerUpperCover?: Selection<SVGLineElement, unknown, null, undefined>
  upperOutliers?: Selection<SVGPathElement, number, SVGGElement | null, unknown>
  upperOutliersCovers?: Selection<SVGRectElement, number, SVGGElement | null, unknown>
}

interface ILineCoords {
  x1: number
  x2: number
  y1: number
  y2: number
}

interface IRange {
  min?: number
  max?: number
}

interface IRectOptions {
  height: number | string
  width: number | string
  x: number
  y: number
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
    const {cellKey={}, containerId, model, plotHeight, plotWidth, xAxis, yAxis} = props
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

    const highlightLabel = useCallback((labelId: string, highlight: boolean) => {
      const label = select(`#${labelId}`)
      label.classed("highlighted", highlight)
      highlightCovers(highlight)
    }, [highlightCovers])

    const toggleBoxPlotLabels = useCallback((labelId: string, visible: boolean, event: MouseEvent) => {
      const label = select(`#${labelId}`)
      const targetElement = event.target as HTMLElement
      const elementRect = targetElement.getBoundingClientRect()
      const container = select(`#${measureSlug}-${containerId}`)
      const containerRect = (container.node() as Element)?.getBoundingClientRect()
      const containerLeft = containerRect?.left || 0
      const containerTop = containerRect?.top || 0
      const labelLeft = elementRect.left - containerLeft - 30
      const labelTop = elementRect.top - containerTop - 30

      label.style("left", `${labelLeft}px`)
        .style("top", `${labelTop}px`)
        .classed("visible", visible)
    }, [containerId, measureSlug])

    const toggleTextTip = useCallback((tipId: string, visible: boolean) => {
      const label = select(`#${tipId}`)
      label.classed("visible", visible)
      highlightCovers(visible)
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

    const calculateLineCoords = useCallback((value: number, index: number) => {
      const [left, right] = xScale?.range() || [0, 1]
      const [bottom, top] = yScale?.range() || [0, 1]
      const coordX = index === 1 ? right : left
      const coordY = index === 1 ? top : bottom
      const boxPlotOffset = index === 1 ? 10 : -10
      const x = isBoxPlotAdornment(model) && !isVertical.current
        ? (plotWidth / xCellCount) / 2 + boxPlotOffset
        : isVertical.current
          ? xScale(value) / xCellCount
          : coordX / xCellCount
      const y = isBoxPlotAdornment(model) && isVertical.current
        ? (plotHeight / yCellCount) / 2 + boxPlotOffset
        : isVertical.current
          ? coordY / yCellCount
          : yScale(value) / yCellCount
      return {x, y}
    }, [model, plotHeight, plotWidth, xCellCount, xScale, yCellCount, yScale])

    const newOutliers = useCallback((outliers: number[], arg1: string) => {
      const selection = select(valueRef.current)
      const offset = 5
      return selection.selectAll("svg")
        .data(outliers)
        .enter()
        .append("path")
        .attr("class", `measure-outlier ${measureSlug}-outlier ${arg1}-outlier`)
        .attr("d", "M0, -3 V3 M-3, 0 H3")
        .attr("transform", (d: number) => {
          const index = outliers.indexOf(d)
          const x = isVertical.current ? xScale(outliers[index]) / xCellCount : (plotWidth / xCellCount) / 2 - offset
          const y = isVertical.current ? (plotHeight / yCellCount) / 2 - offset : yScale(outliers[index]) / yCellCount
          return `translate(${x}, ${y})`
        })
    }, [measureSlug, plotHeight, plotWidth, xCellCount, xScale, yCellCount, yScale])

    const newOutlierCovers = useCallback((outliers: number[], outlierType: string) => {
      const selection = select(valueRef.current)
      const textId = generateIdString("outlier-cover")
      const boxPlotOffset = 5
      const outlierOffset = 3
      return selection.selectAll("svg")
        .data(outliers)
        .enter()
        .append("rect")
          .attr("class", "measure-outlier-cover")
          .attr("id", (d: number) => `${textId}-${outlierType}-${outliers.indexOf(d)}`)
          .attr("data-testid", (d: number) => `${textId}-${outliers.indexOf(d)}`)
          .attr("width", 6)
          .attr("height", 6)
          .attr("rx", 3)
          .attr("ry", 3)
          .attr("x", (d: number) => {
            const index = outliers.indexOf(d)
            return isVertical.current
              ? xScale(outliers[index]) / xCellCount - outlierOffset
              : (plotWidth / xCellCount) / 2 - boxPlotOffset - outlierOffset
          })
          .attr("y", (d: number) => {
            const index = outliers.indexOf(d)
            return isVertical.current
              ? (plotHeight / yCellCount) / 2 - boxPlotOffset - outlierOffset
              : yScale(outliers[index]) / yCellCount - outlierOffset
          })
    }, [generateIdString, plotHeight, plotWidth, xCellCount, xScale, yCellCount, yScale])

    const newLine = useCallback((lineClass: string, lineId: string, coords: ILineCoords) => {
      const selection = select(valueRef.current)
      const { x1, x2, y1, y2 } = coords
      const boxPlotOffset = -5
      const leftOffset = isBoxPlotAdornment(model) && !isVertical.current ? boxPlotOffset : 0
      const topOffset = isBoxPlotAdornment(model) && isVertical.current ? boxPlotOffset : 0
      return selection.append("line")
        .attr("class", lineClass)
        .attr("id", lineId)
        .attr("data-testid", lineId)
        .attr("x1", x1)
        .attr("x2", x2)
        .attr("y1", y1)
        .attr("y2", y2)
        .attr("transform", `translate(${leftOffset}, ${topOffset})`)
    }, [model])

    const newRect = useCallback((rectClass: string, rectId: string, options: IRectOptions) => {
      const selection = select(valueRef.current)
      const { height, width, x, y } = options
      const leftOffset = isVertical.current ? 0 : -10
      const topOffset = isVertical.current ? -10 : 0
      return selection.append("rect")
        .attr("class", rectClass)
        .attr("id", rectId)
        .attr("data-testid", rectId)
        .attr("x", x)
        .attr("y", y)
        .attr("width", width)
        .attr("height", height)
        .attr("transform", `${isBoxPlotAdornment(model) ? `translate(${leftOffset}, ${topOffset})` : `` }`)
    }, [model])

    const calculateRangeCoords = useCallback((rangeValue: number, coords: ILineCoords) => {
      const { x1, x2, y1, y2 } = coords
      return {
        x1: isVertical.current ? xScale(rangeValue) / xCellCount : x1,
        x2: isVertical.current ? xScale(rangeValue) / xCellCount : x2,
        y1: isVertical.current ? y1 : yScale(rangeValue) / yCellCount,
        y2: isVertical.current ? y2 : yScale(rangeValue) / yCellCount
      }
    }, [xCellCount, xScale, yCellCount, yScale])

    const addRange = useCallback((
      rangeMin: number, rangeMax: number, coverClass: string, lineClass: string, valueObj: IValue, coords: ILineCoords
    ) => {
      if (!dataConfig) return
      const rangeId = generateIdString("range")
      const rangeMinId = generateIdString("min")
      const rangeMinCoverId = generateIdString("min-cover")
      const rangeMaxId = generateIdString("max")
      const rangeMaxCoverId = generateIdString("max-cover")
      const rangeMinCoords = calculateRangeCoords(rangeMin, coords)
      const rangeMaxCoords = calculateRangeCoords(rangeMax, coords)
      const boxPlotOffset = 5
      const x = isBoxPlotAdornment(model) && !isVertical.current
        ? (plotWidth / xCellCount) / 2 - boxPlotOffset
        : isVertical.current
          ? rangeMinCoords.x1
          : 0
      const y = isBoxPlotAdornment(model) && isVertical.current
        ? (plotHeight / yCellCount) / 2 - boxPlotOffset
        : !isVertical.current
          ? rangeMaxCoords.y1
          : 0
      const valueForSecondaryAxis = isBoxPlotAdornment(model) ? "20px" : "100%"

      const width = isVertical.current
        ? xScale(rangeMax) - xScale(rangeMin)
        : valueForSecondaryAxis
      const height = !isVertical.current
        ? yScale(rangeMin) - yScale(rangeMax)
        : valueForSecondaryAxis
      const rectClass = clsx("measure-range", `${measureSlug}-range`)
  
      // Add the shaded rectangle that covers the range
      valueObj.range = newRect(rectClass, rangeId, {height, width, x, y})

      // Add the lines at the range min and max
      valueObj.rangeMin = newLine(`${lineClass} range-line`, rangeMinId, rangeMinCoords)
      valueObj.rangeMinCover = newLine(coverClass, rangeMinCoverId, rangeMinCoords)
      valueObj.rangeMax = newLine(`${lineClass} range-line`, rangeMaxId, rangeMaxCoords)
      valueObj.rangeMaxCover = newLine(coverClass, rangeMaxCoverId, rangeMaxCoords)

      // Add the hover behavior for the min and max lines
      const labelId = generateIdString("measure-labels-tip")
      if (showLabel) {
        valueObj.rangeMinCover.on("mouseover", () => highlightLabel(labelId, true))
          .on("mouseout", () => highlightLabel(labelId, false))
        valueObj.rangeMaxCover.on("mouseover", () => highlightLabel(labelId, true))
          .on("mouseout", () => highlightLabel(labelId, false))
      } else {
        valueObj.rangeMinCover.on("mouseover", () => toggleTextTip(labelId, true))
          .on("mouseout", () => toggleTextTip(labelId, false))
        valueObj.rangeMaxCover.on("mouseover", () => toggleTextTip(labelId, true))
          .on("mouseout", () => toggleTextTip(labelId, false))
      }
    }, [dataConfig, generateIdString, calculateRangeCoords, highlightLabel, measureSlug, model, newLine, newRect,
        plotHeight, plotWidth, showLabel, toggleTextTip, xCellCount, xScale, yCellCount, yScale])

    const calculateWhiskerCoords = useCallback((
      minValue: number, maxValue: number, rangeMin: number, rangeMax: number
    ) => {
      const lower = {
        x1: !isVertical.current ? (plotWidth / xCellCount) / 2 : xScale(minValue) / xCellCount,
        x2: !isVertical.current ? (plotWidth / xCellCount) / 2 : xScale(rangeMin) / xCellCount,
        y1: isVertical.current ? (plotHeight / yCellCount) / 2 : yScale(minValue) / yCellCount,
        y2: isVertical.current ? (plotHeight / yCellCount) / 2 : yScale(rangeMin) / yCellCount
      }
      const upper = {
        x1: !isVertical.current ? (plotWidth / xCellCount) / 2 : xScale(rangeMax) / xCellCount,
        x2: !isVertical.current ? (plotWidth / xCellCount) / 2 : xScale(maxValue) / xCellCount,
        y1: isVertical.current ? (plotHeight / yCellCount) / 2 : yScale(rangeMax) / yCellCount,
        y2: isVertical.current ? (plotHeight / yCellCount) / 2 : yScale(maxValue) / yCellCount
      }
      return {lower, upper}
    }, [plotHeight, plotWidth, xCellCount, xScale, yCellCount, yScale])

    const addWhiskers = useCallback((valueObj: IValue, attrId: string, range: IRange, showOutliers=false) => {
      if (!isBoxPlotAdornment(model) || !dataConfig || !attrId || !range.min || !range.max) return
      const lowerOutliers = model.lowerOutliers(attrId, cellKey, dataConfig)
      const upperOutliers = model.upperOutliers(attrId, cellKey, dataConfig)
      const minValue = model.minValue(attrId, cellKey, dataConfig)
      const maxValue = model.maxValue(attrId, cellKey, dataConfig)
      if (minValue === maxValue || !isFinite(minValue) || !isFinite(maxValue)) return

      const lineLowerClass = clsx("measure-line", "box-plot-line", `${measureSlug}-whisker-lower`)
      const coverLowerClass = clsx("measure-cover", "box-plot-cover", `${measureSlug}-whisker-lower`)
      const lineUpperClass = clsx("measure-line", "box-plot-line", `${measureSlug}-whisker-upper`)
      const coverUpperClass = clsx("measure-cover", "box-plot-cover", `${measureSlug}-whisker-upper`)
      const lowerLineId = generateIdString("whisker-lower")
      const lowerCoverId = generateIdString("whisker-lower-cover")
      const upperLineId = generateIdString("whisker-upper")
      const upperCoverId = generateIdString("whisker-upper-cover")
      const whiskerCoords = calculateWhiskerCoords(Number(minValue), Number(maxValue), range.min, range.max)
      const lowerCoords = {
        x1: whiskerCoords.lower.x1,
        x2: whiskerCoords.lower.x2,
        y1: whiskerCoords.lower.y1,
        y2: whiskerCoords.lower.y2
      }
      const upperCoords = {
        x1: whiskerCoords.upper.x1,
        x2: whiskerCoords.upper.x2,
        y1: whiskerCoords.upper.y1,
        y2: whiskerCoords.upper.y2
      }
      valueObj.whiskerLower = newLine(lineLowerClass, lowerLineId, lowerCoords)
      valueObj.whiskerLowerCover = newLine(coverLowerClass, lowerCoverId, lowerCoords)
      valueObj.lowerOutliers = showOutliers ? newOutliers(lowerOutliers, "lower") : undefined
      valueObj.lowerOutliersCovers = showOutliers ? newOutlierCovers(lowerOutliers, "lower") : undefined
      valueObj.whiskerUpper = newLine(lineUpperClass, upperLineId, upperCoords)
      valueObj.whiskerUpperCover = newLine(coverUpperClass, upperCoverId, upperCoords)
      valueObj.upperOutliers = showOutliers ? newOutliers(upperOutliers, "upper") : undefined
      valueObj.upperOutliersCovers = showOutliers ? newOutlierCovers(upperOutliers, "upper") : undefined
    }, [calculateWhiskerCoords, cellKey, dataConfig, generateIdString, measureSlug, model, newLine, newOutliers,
        newOutlierCovers])

    const valuesForTranslationVars = useCallback((
      attrId: string, measureRange: IRange, displayValue: string, displayRange?: string
    ) => {
      if (isBoxPlotAdornment(model) && dataConfig) {
        return [
          Number(model.minValue(attrId, cellKey, dataConfig)),
          Number(measureRange.min),
          Number(displayValue),
          Number(measureRange.max),
          Number(model.maxValue(attrId, cellKey, dataConfig))
        ]
      } else {
        return [
          `${(measureRange.min || measureRange.min === 0) && displayRange ? `${displayRange}` : `${displayValue}`}`
        ]
      }
    }, [cellKey, dataConfig, model])

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
      if ((range || range === 0) && isVertical.current) labelLeft = xScale(plotValue + range) / xCellCount
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

      if (!range && range !== 0) {
        valueObj.cover?.on("mouseover", () => highlightLabel(labelId, true))
          .on("mouseout", () => highlightLabel(labelId, false))
      }

      valueObj.rangeMinCover?.on("mouseover", () => highlightLabel(labelId, true))
        .on("mouseout", () => highlightLabel(labelId, false))
      valueObj.rangeMaxCover?.on("mouseover", () => highlightLabel(labelId, true))
        .on("mouseout", () => highlightLabel(labelId, false))

    }, [adornmentsStore?.activeUnivariateMeasures, classFromKey, containerId, handleEndMoveLabel, handleMoveLabel,
        highlightCovers, highlightLabel, measureSlug, model, xCellCount, xScale])

    const addBoxPlotLabels = useCallback((textContent: string, valueObj: IValue, boxPlotLabelsObj: ILabel) => {
      if (!isBoxPlotAdornment(model)) return
      const container = select(labelRef.current)
      const textId = generateIdString("label")
      const labels = textContent.split("\n")
      const covers = [
        valueObj.whiskerLowerCover,
        valueObj.rangeMinCover,
        valueObj.cover,
        valueObj.rangeMaxCover,
        valueObj.whiskerUpperCover
      ]

      for (let i = 0; i < labels.length; i++) {
        boxPlotLabelsObj.label = container.append("div")
          .text(labels[i])
          .attr("class", "measure-tip measure-labels-tip box-plot-label")
          .attr("id", `${textId}-${i}`)
          .attr("data-testid", `${textId}-${i}`)
        covers[i]?.on("mouseover", (e) => toggleBoxPlotLabels(`${textId}-${i}`, true, e))
          .on("mouseout", (e) => toggleBoxPlotLabels(`${textId}-${i}`, false, e))
      }

      if (model.showOutliers) {
        const xAttrId = dataConfig?.attributeID("x")
        const yAttrId = dataConfig?.attributeID("y")
        const attrId = xAttrId && xAttrType === "numeric" ? xAttrId : yAttrId
        if (!attrId || !dataConfig) return

        const lowerOutliers = model.lowerOutliers(attrId, cellKey, dataConfig)
        const upperOutliers = model.upperOutliers(attrId, cellKey, dataConfig)
        for (let i = 0; i < lowerOutliers.length; i++) {
          const coverId = generateIdString("outlier-cover")
          boxPlotLabelsObj.label = container.append("div")
            .text(lowerOutliers[i])
            .attr("class", "measure-tip measure-labels-tip box-plot-label")
            .attr("id", `${textId}-lower-outlier-${i}`)
            .attr("data-testid", `${textId}-${i}`)
          select(`#${coverId}-lower-${i}`)
            .on("mouseover", (e) => toggleBoxPlotLabels(`${textId}-lower-outlier-${i}`, true, e))
            .on("mouseout", (e) => toggleBoxPlotLabels(`${textId}-lower-outlier-${i}`, false, e))
        }
        for (let i = 0; i < upperOutliers.length; i++) {
          const coverId = generateIdString("outlier-cover")
          boxPlotLabelsObj.label = container.append("div")
            .text(upperOutliers[i])
            .attr("class", "measure-tip measure-labels-tip box-plot-label")
            .attr("id", `${textId}-upper-outlier-${i}`)
            .attr("data-testid", `${textId}-${i}`)
          select(`#${coverId}-upper-${i}`)
            .on("mouseover", (e) => toggleBoxPlotLabels(`${textId}-upper-outlier-${i}`, true, e))
            .on("mouseout", (e) => toggleBoxPlotLabels(`${textId}-upper-outlier-${i}`, false, e))
        }
      }
    }, [cellKey, dataConfig, generateIdString, model, toggleBoxPlotLabels, xAttrType])

    const addTextTip = useCallback((plotValue: number, textContent: string, valueObj: IValue, range?: number) => {
      const selection = select(valueRef.current)
      const textId = generateIdString("tip")
      const textClass = clsx("measure-tip", `${measureSlug}-tip`)
      const lineOffset = 5
      const topOffset = plotHeight / yCellCount * .25 // 25% of the height of the subplot
      const rangeOffset = range && range !== plotValue
        ? isVertical.current
          ? xScale(range) - xScale(plotValue)
          : yScale(range) - yScale(plotValue)
        : 0
      let x = isVertical.current ? xScale(plotValue) / xCellCount + lineOffset : (plotWidth - plotWidth/2) / xCellCount
      if ((range || range === 0) && isVertical.current) x = xScale(plotValue + rangeOffset) / xCellCount + lineOffset
      let y = isVertical.current ? topOffset : yScale(plotValue) / yCellCount - lineOffset
      if ((range || range === 0) && !isVertical.current) y = yScale(plotValue + rangeOffset) / yCellCount - lineOffset

      // If x plus the approximate width of the text tip would extend beyond the right boundary of the subplot, set x to
      // plotWidth minus the text tip width or zero, whichever is greater.
      const textTipWidth = measureText(textContent)
      if (x + textTipWidth > plotWidth / xCellCount) x = Math.max(plotWidth / xCellCount - textTipWidth, 0)

      valueObj.text = selection.append("text")
        .text(textContent)
        .attr("class", textClass)
        .attr("id", textId)
        .attr("data-testid", textId)
        .attr("x", x)
        .attr("y", y)

      valueObj.cover?.on("mouseover", () => toggleTextTip(textId, true))
        .on("mouseout", () => toggleTextTip(textId, false))
      valueObj.rangeMinCover?.on("mouseover", () => toggleTextTip(textId, true))
        .on("mouseout", () => toggleTextTip(textId, false))
      valueObj.rangeMaxCover?.on("mouseover", () => toggleTextTip(textId, true))
        .on("mouseout", () => toggleTextTip(textId, false))

    }, [generateIdString, measureSlug, plotHeight, plotWidth, toggleTextTip, xCellCount, xScale, yCellCount, yScale])

    const renderAdornmentElements = useCallback((
      measure: IMeasureInstance, valueObj: IValue, labelObj: ILabel, boxPlotLabelsObj?: ILabel
    ) => {
      const xAttrId = dataConfig?.attributeID("x")
      const yAttrId = dataConfig?.attributeID("y")
      const attrId = xAttrId && xAttrType === "numeric" ? xAttrId : yAttrId
      if (!attrId || !dataConfig) return
      const value = model.measureValue(attrId, cellKey, dataConfig)
      if (value === undefined || isNaN(value)) return

      const multiScale = isVertical.current ? layout.getAxisMultiScale("bottom") : layout.getAxisMultiScale("left")
      const displayValue = multiScale?.formatValueForScale(value) || valueLabelString(value)
      const plotValue = Number(displayValue)
      const measureRange: IRange | undefined = attrId && model.hasRange
        ? model.computeMeasureRange(attrId, cellKey, dataConfig)
        : {}
      const displayRange = measureRange.min || measureRange.min === 0
        ? multiScale?.formatValueForScale(measureRange.min) || valueLabelString(measureRange.min)
        : undefined
      const {x: x1, y: y1} = calculateLineCoords(plotValue, 1)
      const {x: x2, y: y2} = calculateLineCoords(plotValue, 2)
      const lineClass = clsx("measure-line", `${measureSlug}-line`)
      const lineId = generateIdString("line")
      const coverClass = clsx("measure-cover", `${measureSlug}-cover`)
      const coverId = generateIdString("cover")
      const translationVars = valuesForTranslationVars(attrId, measureRange, displayValue, displayRange)
      const textContent = `${t(model.labelTitle, { vars: translationVars })}`

      valueObj.line = newLine(lineClass, lineId, {x1, x2, y1, y2})
      if ((measureRange?.min || measureRange?.min === 0) && (measureRange?.max || measureRange?.max === 0)) {
        addRange(measureRange.min, measureRange.max, coverClass, lineClass, valueObj, {x1, x2, y1, y2})
      }
      if (!model.hasRange || isBoxPlotAdornment(model)) {
        // Only add a cover for the value line if the adornment doesn't have a range or if it's a box plot
        valueObj.cover = newLine(coverClass, coverId, {x1, x2, y1, y2})
      }
      if (isBoxPlotAdornment(model) && measureRange && attrId) {
        addWhiskers(valueObj, attrId, measureRange, model.showOutliers)
      }
      if (isBoxPlotAdornment(model) && boxPlotLabelsObj) {
        addBoxPlotLabels(textContent, valueObj, boxPlotLabelsObj)
      } else if (showLabel) {
        addLabels(labelObj, measure, textContent, valueObj, plotValue, measureRange.max)
      } else {
        addTextTip(plotValue, textContent, valueObj, measureRange.max)
      }
    }, [addBoxPlotLabels, addLabels, addRange, addTextTip, addWhiskers, calculateLineCoords, cellKey, dataConfig,
        generateIdString, layout, measureSlug, model, newLine, showLabel, valuesForTranslationVars, xAttrType])

    // Add the lines and their associated covers and labels
    const refreshValues = useCallback(() => {
      if (!model.isVisible) return
      const measure = model?.measures.get(instanceKey)
      const newValueObj: IValue = {}
      const newLabelObj: ILabel = {}
      const newBoxPlotLabelsObj: ILabel = {}
      const selection = select(valueRef.current)
      const labelSelection = select(labelRef.current)

      // Remove the previous value's elements
      selection.html(null)
      labelSelection.html(null)

      if (measure) {
        renderAdornmentElements(measure, newValueObj, newLabelObj, newBoxPlotLabelsObj)
      }
    }, [model, instanceKey, renderAdornmentElements])

    // Refresh values on Plotted Value expression changes
    useEffect(function refreshExpressionChange() {
      return mstAutorun(() => {
        // The next line should not be needed, but without it this autorun doesn't get triggered.
        // TODO: Figure out exactly why this is needed and adjust accordingly.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const modelValue = isPlottedValueAdornment(model) ? model.expression : undefined
        model.updateCategories(graphModel.getUpdateCategoriesOptions())
      }, { name: "UnivariateMeasureAdornmentComponent.refreshExpressionChange" }, model)
    }, [graphModel, model])

    // Refresh values on axis changes
    useEffect(function refreshAxisChange() {
      return mstAutorun(() => {
        // We observe changes to the axis domains within the autorun by extracting them from the axes below.
        // We do this instead of including domains in the useEffect dependency array to prevent domain changes
        // from triggering a reinstall of the autorun.
        const { domain: xDomain } = xAxis // eslint-disable-line @typescript-eslint/no-unused-vars
        const { domain: yDomain } = yAxis // eslint-disable-line @typescript-eslint/no-unused-vars
        isVertical.current = dataConfig?.attributeType("x") === "numeric"
        refreshValues()
      }, { name: "UnivariateMeasureAdornmentComponent.refreshAxisChange" }, model)
    }, [dataConfig, model, refreshValues, xAxis, yAxis])

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
            (showLabel || isBoxPlotAdornment(model)) &&
              <div className="measure-labels" id={`measure-labels-${containerId}`} ref={labelRef} />
          }
        </div>
      </>
    )
  }
)
