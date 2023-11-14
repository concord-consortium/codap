import React, { useCallback, useMemo, useRef } from "react"
import { select, Selection } from "d3"
import { observer } from "mobx-react-lite"
import { clsx } from "clsx"
import t from "../../../../../utilities/translation/translate"
import { INumericAxisModel } from "../../../../axis/models/axis-model"
import { useAxisLayoutContext } from "../../../../axis/models/axis-layout-context"
import { useGraphDataConfigurationContext } from "../../../hooks/use-graph-data-configuration-context"
import { IBoxPlotAdornmentModel } from "./box-plot-adornment-model"
import { ILabel, IRange, IValue } from "../univariate-measure-adornment-types"
import { UnivariateMeasureAdornmentHelper } from "../univariate-measure-adornment-helper"
import { UnivariateMeasureAdornmentBaseComponent } from "../univariate-measure-adornment-base-component"

import "./box-plot-adornment-component.scss"

interface IBoxPlotValue extends IValue {
  whiskerLower?: Selection<SVGLineElement, unknown, null, undefined>
  whiskerLowerCover?: Selection<SVGLineElement, unknown, null, undefined>
  lowerOutliers?: Selection<SVGPathElement, number, SVGGElement | null, unknown>
  lowerOutliersCovers?: Selection<SVGRectElement, number, SVGGElement | null, unknown>
  whiskerUpper?: Selection<SVGLineElement, unknown, null, undefined>
  whiskerUpperCover?: Selection<SVGLineElement, unknown, null, undefined>
  upperOutliers?: Selection<SVGPathElement, number, SVGGElement | null, unknown>
  upperOutliersCovers?: Selection<SVGRectElement, number, SVGGElement | null, unknown>
}

interface IProps {
  cellKey: Record<string, string>
  containerId?: string
  model: IBoxPlotAdornmentModel
  plotHeight: number
  plotWidth: number
  xAxis: INumericAxisModel
  yAxis: INumericAxisModel
}

export const BoxPlotAdornmentComponent = observer(function BoxPlotAdornmentComponent (props: IProps) {
  const {cellKey={}, containerId, model, plotHeight, plotWidth, xAxis, yAxis} = props
  const layout = useAxisLayoutContext()
  const dataConfig = useGraphDataConfigurationContext()
  const helper = useMemo(() => {
    return new UnivariateMeasureAdornmentHelper(cellKey, layout, model, plotHeight, plotWidth, containerId)
  }, [cellKey, containerId, layout, model, plotHeight, plotWidth])
  const xAttrId = dataConfig?.attributeID("x")
  const yAttrId = dataConfig?.attributeID("y")
  const xAttrType = dataConfig?.attributeType("x")
  const yAttrType = dataConfig?.attributeType("y")
  const attrId = xAttrId && xAttrType === "numeric" ? xAttrId : yAttrId
  const cellCounts = useMemo(() => {
    return model.cellCount(layout, xAttrType, yAttrType)
  }, [layout, model, xAttrType, yAttrType])
  const isVertical = useRef(!!(xAttrType && xAttrType === "numeric"))
  const boxPlotOffset = 5
  const secondaryAxisX = plotWidth / cellCounts.x / 2 - boxPlotOffset
  const secondaryAxisY = plotHeight / cellCounts.y / 2 - boxPlotOffset
  const valueRef = useRef<SVGGElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)

  const toggleBoxPlotLabels = useCallback((labelId: string, visible: boolean, event: MouseEvent) => {
    const label = select(`#${labelId}`)
    const targetElement = event.target as HTMLElement
    const elementRect = targetElement.getBoundingClientRect()
    const container = select(`#${helper.measureSlug}-${containerId}`)
    const containerRect = (container.node() as Element)?.getBoundingClientRect()
    const containerLeft = containerRect?.left || 0
    const containerTop = containerRect?.top || 0
    const labelLeft = elementRect.left - containerLeft - 30
    const labelTop = elementRect.top - containerTop - 30

    label.style("left", `${labelLeft}px`)
      .style("top", `${labelTop}px`)
      .classed("visible", visible)
  }, [containerId, helper])

  const newOutliers = useCallback((outliers: number[], arg1: string) => {
    const selection = select(valueRef.current)
    return selection.selectAll("svg")
      .data(outliers)
      .enter()
      .append("path")
      .attr("class", `measure-outlier ${helper.measureSlug}-outlier ${arg1}-outlier`)
      .attr("d", "M0, -3 V3 M-3, 0 H3")
      .attr("transform", (d: number) => {
        const index = outliers.indexOf(d)
        const x = isVertical.current
          ? helper.xScale(outliers[index]) / cellCounts.x
          : secondaryAxisX
        const y = isVertical.current
          ? secondaryAxisY
          : helper.yScale(outliers[index]) / cellCounts.y
        return `translate(${x}, ${y})`
      })
  }, [cellCounts, helper, secondaryAxisX, secondaryAxisY])

  const newOutlierCovers = useCallback((outliers: number[], outlierType: string) => {
    const selection = select(valueRef.current)
    const textId = helper.generateIdString("outlier-cover")
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
            ? helper.xScale(outliers[index]) / cellCounts.x - outlierOffset
            : secondaryAxisX - outlierOffset
        })
        .attr("y", (d: number) => {
          const index = outliers.indexOf(d)
          return isVertical.current
            ? secondaryAxisY - outlierOffset
            : helper.yScale(outliers[index]) / cellCounts.y - outlierOffset
        })
  }, [cellCounts, helper, secondaryAxisX, secondaryAxisY])

  const calculateWhiskerCoords = useCallback((minVal: number, maxVal: number, rangeMin: number, rangeMax: number) => {
    const subplotWidth = plotWidth / cellCounts.x
    const subplotHeight = plotHeight / cellCounts.y
    const lower = {
      x1: !isVertical.current ? subplotWidth / 2 : helper.xScale(minVal) / cellCounts.x,
      x2: !isVertical.current ? subplotWidth / 2 : helper.xScale(rangeMin) / cellCounts.x,
      y1: isVertical.current ? subplotHeight / 2 : helper.yScale(minVal) / cellCounts.y,
      y2: isVertical.current ? subplotHeight / 2 : helper.yScale(rangeMin) / cellCounts.y
    }
    const upper = {
      x1: !isVertical.current ? subplotWidth / 2 : helper.xScale(rangeMax) / cellCounts.x,
      x2: !isVertical.current ? subplotWidth / 2 : helper.xScale(maxVal) / cellCounts.x,
      y1: isVertical.current ? subplotHeight / 2 : helper.yScale(rangeMax) / cellCounts.y,
      y2: isVertical.current ? subplotHeight / 2 : helper.yScale(maxVal) / cellCounts.y
    }
    return {lower, upper}
  }, [cellCounts, helper, plotHeight, plotWidth])

  const addWhiskers = useCallback((valueObj: IBoxPlotValue, range: IRange, showOutliers=false) => {
    if (!dataConfig || !attrId || !range.min || !range.max) return
    const lowerOutliers = model.lowerOutliers(attrId, cellKey, dataConfig)
    const upperOutliers = model.upperOutliers(attrId, cellKey, dataConfig)
    const minValue = model.minWhiskerValue(attrId, cellKey, dataConfig)
    const maxValue = model.maxWhiskerValue(attrId, cellKey, dataConfig)
    if (minValue === maxValue || !isFinite(minValue) || !isFinite(maxValue)) return

    const lineLowerClass = clsx("measure-line", "box-plot-line", `${helper.measureSlug}-whisker-lower`)
    const coverLowerClass = clsx("measure-cover", "box-plot-cover", `${helper.measureSlug}-whisker-lower`)
    const lineUpperClass = clsx("measure-line", "box-plot-line", `${helper.measureSlug}-whisker-upper`)
    const coverUpperClass = clsx("measure-cover", "box-plot-cover", `${helper.measureSlug}-whisker-upper`)
    const lineLowerId = helper.generateIdString("whisker-lower")
    const coverLowerId = helper.generateIdString("whisker-lower-cover")
    const lineUpperId = helper.generateIdString("whisker-upper")
    const coverUpperId = helper.generateIdString("whisker-upper-cover")
    const whiskerCoords = calculateWhiskerCoords(minValue, maxValue, range.min, range.max)
    const whiskerLowerLineSpecs = {
      isVertical: isVertical.current,
      lineClass: lineLowerClass,
      lineId: lineLowerId,
      offset: -5,
      x1: whiskerCoords.lower.x1,
      x2: whiskerCoords.lower.x2,
      y1: whiskerCoords.lower.y1,
      y2: whiskerCoords.lower.y2
    }
    const whiskerLowerCoverSpecs = {...whiskerLowerLineSpecs, lineClass: coverLowerClass, lineId: coverLowerId}
    const whiskerUpperLineSpecs = {
      isVertical: isVertical.current,
      lineClass: lineUpperClass,
      lineId: lineUpperId,
      offset: -5,
      x1: whiskerCoords.upper.x1,
      x2: whiskerCoords.upper.x2,
      y1: whiskerCoords.upper.y1,
      y2: whiskerCoords.upper.y2
    }
    const whiskerUpperCoverSpecs = {...whiskerUpperLineSpecs, lineClass: coverUpperClass, lineId: coverUpperId}
    valueObj.whiskerLower = helper.newLine(valueRef.current, whiskerLowerLineSpecs)
    valueObj.whiskerLowerCover = helper.newLine(valueRef.current, whiskerLowerCoverSpecs)
    valueObj.lowerOutliers = showOutliers ? newOutliers(lowerOutliers, "lower") : undefined
    valueObj.lowerOutliersCovers = showOutliers ? newOutlierCovers(lowerOutliers, "lower") : undefined
    valueObj.whiskerUpper = helper.newLine(valueRef.current, whiskerUpperLineSpecs)
    valueObj.whiskerUpperCover = helper.newLine(valueRef.current, whiskerUpperCoverSpecs)
    valueObj.upperOutliers = showOutliers ? newOutliers(upperOutliers, "upper") : undefined
    valueObj.upperOutliersCovers = showOutliers ? newOutlierCovers(upperOutliers, "upper") : undefined
  }, [dataConfig, attrId, model, cellKey, helper, calculateWhiskerCoords, newOutliers, newOutlierCovers])

  const addBoxPlotLabels = useCallback((textContent: string, valueObj: IBoxPlotValue, labelsObj: ILabel) => {
    const container = select(labelRef.current)
    const textId = helper.generateIdString("label")
    const labels = textContent.split("\n")
    const covers = [
      valueObj.whiskerLowerCover,
      valueObj.rangeMinCover,
      valueObj.cover,
      valueObj.rangeMaxCover,
      valueObj.whiskerUpperCover
    ]

    for (let i = 0; i < labels.length; i++) {
      labelsObj.label = container.append("div")
        .text(labels[i])
        .attr("class", "measure-tip measure-labels-tip box-plot-label")
        .attr("id", `${textId}-${i}`)
        .attr("data-testid", `${textId}-${i}`)
      covers[i]?.on("mouseover", (e) => toggleBoxPlotLabels(`${textId}-${i}`, true, e))
        .on("mouseout", (e) => toggleBoxPlotLabels(`${textId}-${i}`, false, e))
    }

    if (model.showOutliers) {
      if (!attrId || !dataConfig) return

      const lowerOutliers = model.lowerOutliers(attrId, cellKey, dataConfig)
      const upperOutliers = model.upperOutliers(attrId, cellKey, dataConfig)
      for (let i = 0; i < lowerOutliers.length; i++) {
        const coverId = helper.generateIdString("outlier-cover")
        labelsObj.label = container.append("div")
          .text(lowerOutliers[i])
          .attr("class", "measure-tip measure-labels-tip box-plot-label")
          .attr("id", `${textId}-lower-outlier-${i}`)
          .attr("data-testid", `${textId}-${i}`)
        select(`#${coverId}-lower-${i}`)
          .on("mouseover", (e) => toggleBoxPlotLabels(`${textId}-lower-outlier-${i}`, true, e))
          .on("mouseout", (e) => toggleBoxPlotLabels(`${textId}-lower-outlier-${i}`, false, e))
      }
      for (let i = 0; i < upperOutliers.length; i++) {
        const coverId = helper.generateIdString("outlier-cover")
        labelsObj.label = container.append("div")
          .text(upperOutliers[i])
          .attr("class", "measure-tip measure-labels-tip box-plot-label")
          .attr("id", `${textId}-upper-outlier-${i}`)
          .attr("data-testid", `${textId}-${i}`)
        select(`#${coverId}-upper-${i}`)
          .on("mouseover", (e) => toggleBoxPlotLabels(`${textId}-upper-outlier-${i}`, true, e))
          .on("mouseout", (e) => toggleBoxPlotLabels(`${textId}-upper-outlier-${i}`, false, e))
      }
    }
  }, [attrId, cellKey, dataConfig, helper, labelRef, model, toggleBoxPlotLabels])

  const addAdornmentElements = useCallback((valueObj: IBoxPlotValue, labelsObj: ILabel) => {
    if (!attrId || !dataConfig) return
    const value = model.measureValue(attrId, cellKey, dataConfig)
    if (value === undefined || isNaN(value)) return

    const { coords, coverClass, coverId, displayValue, lineClass, lineId, measureRange } =
      helper.adornmentSpecs(attrId, dataConfig, value, isVertical.current, cellCounts, secondaryAxisX, secondaryAxisY)
    const translationVars = [
      model.minWhiskerValue(attrId, cellKey, dataConfig),
      measureRange.min,
      displayValue,
      measureRange.max,
      model.maxWhiskerValue(attrId, cellKey, dataConfig)
    ]
    const textContent = `${t(model.labelTitle, { vars: translationVars })}`
    const lineSpecs = {
      isVertical: isVertical.current,
      lineClass,
      lineId,
      offset: boxPlotOffset * -1,
      x1: !isVertical.current ? coords.x1 - boxPlotOffset : coords.x1,
      x2: !isVertical.current ? coords.x2 + boxPlotOffset * 3 : coords.x1,
      y1: isVertical.current ? coords.y1 - boxPlotOffset : coords.y1,
      y2: isVertical.current ? coords.y2 + boxPlotOffset * 3 : coords.y1
    }
    const coverSpecs = {...lineSpecs, lineClass: coverClass, lineId: coverId}
    valueObj.line = helper.newLine(valueRef.current, lineSpecs)
    valueObj.cover = helper.newLine(valueRef.current, coverSpecs)

    if ((measureRange?.min || measureRange?.min === 0) && (measureRange?.max || measureRange?.max === 0)) {
      const rangeSpecs = {
        cellCounts,
        coords,
        coverClass,
        extentForSecondaryAxis: "20px",
        isVertical: isVertical.current,
        lineClass,
        lineOffset: boxPlotOffset * -1,
        rangeMin: measureRange.min,
        rangeMax: measureRange.max,
        rectOffset: boxPlotOffset * -2,
        secondaryAxisX,
        secondaryAxisY
      }
      helper.addRange(valueRef.current, valueObj, rangeSpecs)
    }
    addWhiskers(valueObj, measureRange, model.showOutliers)
    addBoxPlotLabels(textContent, valueObj, labelsObj)
  }, [addBoxPlotLabels, addWhiskers, attrId, cellCounts, cellKey, dataConfig, helper, model,
      secondaryAxisX, secondaryAxisY])

  const refreshValues = useCallback(() => {
    if (!model.isVisible) return
    const newValueObj: IBoxPlotValue = {}
    const newLabelsObj: ILabel = {}
    const selection = select(valueRef.current)
    const labelSelection = select(labelRef.current)

    // Remove the previous value's elements
    selection.html(null)
    labelSelection.html(null)

    addAdornmentElements(newValueObj, newLabelsObj)
  }, [model.isVisible, labelRef, addAdornmentElements])

  return (
    <UnivariateMeasureAdornmentBaseComponent
      classFromKey={helper.classFromKey}
      containerId={containerId}
      labelRef={labelRef}
      measureSlug={helper.measureSlug}
      model={model}
      showLabel={true}
      valueRef={valueRef}
      xAxis={xAxis}
      yAxis={yAxis}
      refreshValues={refreshValues}
      setIsVertical={(adornmentIsVertical: boolean) => { isVertical.current = adornmentIsVertical }}
    />
  )
})
