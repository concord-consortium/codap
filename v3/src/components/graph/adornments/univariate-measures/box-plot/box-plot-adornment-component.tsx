import React, { useCallback, useMemo, useRef } from "react"
import { select, Selection } from "d3"
import { observer } from "mobx-react-lite"
import { clsx } from "clsx"
import { t } from "../../../../../utilities/translation/translate"
import { useGraphContentModelContext } from "../../../hooks/use-graph-content-model-context"
import { useGraphDataConfigurationContext } from "../../../hooks/use-graph-data-configuration-context"
import { useGraphLayoutContext } from "../../../hooks/use-graph-layout-context"
import { useAdornmentAttributes } from "../../../hooks/use-adornment-attributes"
import { useAdornmentCells } from "../../../hooks/use-adornment-cells"
import { IAdornmentComponentProps } from "../../adornment-component-info"
import { IBoxPlotAdornmentModel } from "./box-plot-adornment-model"
import { ILabel, IRange, IValue } from "../univariate-measure-adornment-types"
import { UnivariateMeasureAdornmentHelper } from "../univariate-measure-adornment-helper"
import { UnivariateMeasureAdornmentBaseComponent } from "../univariate-measure-adornment-base-component"

import "./box-plot-adornment-component.scss"

interface IBoxPlotValue extends IValue {
  iqrCover?: Selection<SVGRectElement, unknown, null, undefined>
  whiskerLower?: Selection<SVGLineElement, unknown, null, undefined>
  whiskerLowerCover?: Selection<SVGLineElement, unknown, null, undefined>
  lowerOutliers?: Selection<SVGPathElement, number, SVGGElement | null, unknown>
  lowerOutliersCovers?: Selection<SVGRectElement, number, SVGGElement | null, unknown>
  q1Cover?: Selection<SVGLineElement, unknown, null, undefined>
  q3Cover?: Selection<SVGLineElement, unknown, null, undefined>
  whiskerUpper?: Selection<SVGLineElement, unknown, null, undefined>
  whiskerUpperCover?: Selection<SVGLineElement, unknown, null, undefined>
  upperOutliers?: Selection<SVGPathElement, number, SVGGElement | null, unknown>
  upperOutliersCovers?: Selection<SVGRectElement, number, SVGGElement | null, unknown>
  ici?: Selection<SVGLineElement, unknown, null, undefined>
  iciCover?: Selection<SVGLineElement, unknown, null, undefined>
}

export const BoxPlotAdornmentComponent = observer(function BoxPlotAdornmentComponent (props: IAdornmentComponentProps) {
  const {cellKey={}, cellCoords, containerId, plotHeight, plotWidth,
    xAxis, yAxis, spannerRef} = props
  const graphModel = useGraphContentModelContext()
  const model = props.model as IBoxPlotAdornmentModel
  const layout = useGraphLayoutContext()
  const dataConfig = useGraphDataConfigurationContext()
  const { xAttrId, yAttrId, xAttrType } = useAdornmentAttributes()
  const { cellCounts } = useAdornmentCells(model, cellKey)
  const helper = useMemo(() => {
    return new UnivariateMeasureAdornmentHelper(cellKey, layout, model, containerId)
  }, [cellKey, containerId, layout, model])
  const attrId = xAttrId && xAttrType === "numeric" ? xAttrId : yAttrId
  const isVertical = useRef(!!(xAttrType && xAttrType === "numeric"))
  const boxPlotOffset = 5
  const secondaryAxisX = plotWidth / cellCounts.x / 2 - boxPlotOffset
  const secondaryAxisY = plotHeight / cellCounts.y / 2 - boxPlotOffset
  const valueRef = useRef<SVGGElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const fullHeightLinesRef = useRef<Selection<SVGPathElement, unknown, null, undefined> | null>(null)

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
    const { minWhiskerValue, maxWhiskerValue, lowerOutliers, upperOutliers} = model.getBoxPlotParams(cellKey)
    if (minWhiskerValue === maxWhiskerValue || !isFinite(minWhiskerValue) || !isFinite(maxWhiskerValue)) return

    const lineLowerClass = clsx("measure-line", "box-plot-line", `${helper.measureSlug}-whisker-lower`)
    const coverLowerClass = clsx("measure-cover", "box-plot-cover", `${helper.measureSlug}-whisker-lower`)
    const lineUpperClass = clsx("measure-line", "box-plot-line", `${helper.measureSlug}-whisker-upper`)
    const coverUpperClass = clsx("measure-cover", "box-plot-cover", `${helper.measureSlug}-whisker-upper`)
    const lineLowerId = helper.generateIdString("whisker-lower")
    const coverLowerId = helper.generateIdString("whisker-lower-cover")
    const lineUpperId = helper.generateIdString("whisker-upper")
    const coverUpperId = helper.generateIdString("whisker-upper-cover")
    const whiskerCoords = calculateWhiskerCoords(minWhiskerValue, maxWhiskerValue, range.min, range.max)
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

  const addICI = useCallback((valueObj: IBoxPlotValue) => {

    const calculateIciCoords = () => {
      const subplotWidth = plotWidth / cellCounts.x
      const subplotHeight = plotHeight / cellCounts.y
      return {
        x1: !isVertical.current ? subplotWidth / 2 : helper.xScale(iciRange.min) / cellCounts.x,
        x2: !isVertical.current ? subplotWidth / 2 : helper.xScale(iciRange.max) / cellCounts.x,
        y1: isVertical.current ? subplotHeight / 2 : helper.yScale(iciRange.min) / cellCounts.y,
        y2: isVertical.current ? subplotHeight / 2 : helper.yScale(iciRange.max) / cellCounts.y
      }
    }

    const fullHeightLinesPath = () => {
      const graphWidth = layout.plotWidth,
        graphHeight = layout.plotHeight,
        cellWidth = graphWidth / cellCounts.x,
        cellHeight = graphHeight / cellCounts.y,
        lowerCoord = isVertical.current ? helper.xScale(iciRange.min) / cellCounts.x
          : helper.yScale(iciRange.min) / cellCounts.y,
        upperCoord = isVertical.current ? helper.xScale(iciRange.max) / cellCounts.x
          : helper.yScale(iciRange.max) / cellCounts.y,
        templatePath = isVertical.current
          ? `M%@,%@ v%@ M%@,%@ v%@`
          : `M%@,%@ h%@ M%@,%@ h%@`,
        replacementVars = isVertical.current
          ? [
            lowerCoord + cellCoords.col * cellWidth, 0, graphHeight,
            upperCoord + cellCoords.col * cellWidth, 0, graphHeight
          ]
          : [
            0, lowerCoord + cellCoords.row * cellHeight, graphWidth,
            0, upperCoord + cellCoords.row * cellHeight, graphWidth
          ]
      // Note that we use translate just as a way to replace %@ with the actual values
      return t(templatePath, {vars: replacementVars})
    }

    if (!dataConfig || !attrId) return
    const iciClass = clsx("measure-line", "box-plot-line", `${helper.measureSlug}-ici`)
    const iciCoverClass = clsx("measure-cover", "box-plot-cover", `${helper.measureSlug}-ici`)
    const iciRange = model.computeICIRange(attrId, cellKey, dataConfig)
    const iciId = helper.generateIdString("ici")
    const iciCoverId = helper.generateIdString("ici-cover")
    const iciCoords = calculateIciCoords()
    const iciSpecs = {
      isVertical: isVertical.current,
      lineClass: iciClass,
      lineId: iciId,
      offset: -5,
      x1: iciCoords.x1,
      x2: iciCoords.x2,
      y1: iciCoords.y1,
      y2: iciCoords.y2
    }
    const iciCoverSpecs = {...iciSpecs, lineClass: iciCoverClass, lineId: iciCoverId}
    valueObj.ici = helper.newLine(valueRef.current, iciSpecs)
    valueObj.iciCover = helper.newLine(valueRef.current, iciCoverSpecs)
    if (spannerRef) {
      fullHeightLinesRef.current?.remove()
      select(spannerRef.current).attr("class", "measure-container") // So the classes applied to the lines
                                                                    // will be scoped to the spanner
      fullHeightLinesRef.current = spannerRef.current && select(spannerRef.current).append("path")
        .attr("class", "full-height-lines ici")
        .attr("id", `${helper.generateIdString("path")}`)
        .attr("data-testid", `${helper.measureSlug}-error-bar`)
        .attr("d", fullHeightLinesPath())
    }
  }, [dataConfig, attrId, helper, model, cellKey, spannerRef, plotWidth, cellCounts.x, cellCounts.y, plotHeight,
            layout.plotWidth, layout.plotHeight, cellCoords.col, cellCoords.row])

  const addQCovers = useCallback((valueObj: IBoxPlotValue) => {

    const calculateQCoverSpecs = (qValue: number) => {
      const calculateQCoords = (value:number) => {
        // The coordinates are those of the bottom and top edges of the box portion of the box plot
        // They are the same as for the median (aka line)
        const subplotWidth = plotWidth / cellCounts.x
        const subplotHeight = plotHeight / cellCounts.y
        const offset = 2 * boxPlotOffset
        return {
          x1: !isVertical.current ? subplotWidth / 2 - offset : helper.xScale(value) / cellCounts.x,
          x2: !isVertical.current ? subplotWidth / 2 + offset : helper.xScale(value) / cellCounts.x,
          y1: isVertical.current ? subplotHeight / 2 - offset : helper.yScale(value) / cellCounts.y,
          y2: isVertical.current ? subplotHeight / 2 + offset : helper.yScale(value) / cellCounts.y
        }
      }

      const qCoords = calculateQCoords(qValue)
      return {
        isVertical: isVertical.current,
        lineClass: qCoverClass,
        lineId: qCoverId,
        offset: -5,
        x1: qCoords.x1,
        x2: qCoords.x2,
        y1: qCoords.y1,
        y2: qCoords.y2
      }
    }

    if (!dataConfig || !attrId) return
    const qCoverClass = clsx("measure-cover", "box-plot-cover", `${helper.measureSlug}-q`)
    const caseValues = model.getCaseValues(attrId, cellKey, dataConfig)
    const qCoverId = helper.generateIdString("q-cover")
    const q1CoverSpecs = calculateQCoverSpecs(model.lowerQuartile(caseValues))
    const q3CoverSpecs = calculateQCoverSpecs(model.upperQuartile(caseValues))
    valueObj.q1Cover = helper.newLine(valueRef.current, q1CoverSpecs)
    valueObj.q3Cover = helper.newLine(valueRef.current, q3CoverSpecs)
  }, [dataConfig, attrId, helper, model, cellKey, plotWidth, cellCounts.x, cellCounts.y, plotHeight])

  const addBoxPlotLabels = useCallback((textContent: string, valueObj: IBoxPlotValue, labelsObj: ILabel) => {

    const toggleICILabels = (labelId: string, visible: boolean, event: MouseEvent) => {
      toggleBoxPlotLabels(labelId, visible, event)
      fullHeightLinesRef.current?.classed("highlighted", visible)
    }

    const selectRange = ([min, max]: number[], event: MouseEvent) => {
      if (!dataConfig || !attrId || !dataConfig.dataset || min === undefined || max === undefined) return
      const casesToSelect = model.getCasesWithValuesInRange(attrId, cellKey, dataConfig, min, max)
      if (event.shiftKey) {
        dataConfig.dataset.selectCases(casesToSelect)
      } else {
        dataConfig.dataset.setSelectedCases(casesToSelect)
      }
    }

    const container = select(labelRef.current)
    const textId = helper.generateIdString("label")
    const labels = textContent.split("\n")
    const covers = [
      valueObj.whiskerLowerCover,
      valueObj.q1Cover,
      valueObj.cover,
      valueObj.q3Cover,
      valueObj.whiskerUpperCover,
      null, // valueObj.range causes problems when part of this array. Not sure why.
      valueObj.iciCover
    ]
    const { median, lowerQuartile, upperQuartile,
      minWhiskerValue, maxWhiskerValue, lowerOutliers, upperOutliers} = model.getBoxPlotParams(cellKey)
    const selectionBounds = [
      [minWhiskerValue, lowerQuartile],
      [lowerQuartile, median],
      [],
      [median, upperQuartile],
      [upperQuartile, maxWhiskerValue],
      [],
      []
    ]

    for (let i = 0; i < labels.length; i++) {
      labelsObj.label = container.append("div")
        .text(labels[i])
        .attr("class", "measure-tip measure-labels-tip box-plot-label")
        .attr("id", `${textId}-${i}`)
        .attr("data-testid", `${textId}-${i}`)
      covers[i]?.on("mouseover", (e) => toggleBoxPlotLabels(`${textId}-${i}`, true, e))
        .on("mouseout", (e) => toggleBoxPlotLabels(`${textId}-${i}`, false, e))
        .on("click", (e) => selectRange(selectionBounds[i], e))
    }
    valueObj.range?.on("mouseover", (e) => toggleBoxPlotLabels(`${textId}-${5}`, true, e))
      .on("mouseout", (e) => toggleBoxPlotLabels(`${textId}-${5}`, false, e))
      .on("click", (e) => selectRange([lowerQuartile, upperQuartile], e))
    valueObj.iciCover?.on("mouseover", (e) => toggleICILabels(`${textId}-${6}`, true, e))
      .on("mouseout", (e) => toggleICILabels(`${textId}-${6}`, false, e))

    if (model.showOutliers) {
      if (!attrId || !dataConfig) return

      for (let i = 0; i < lowerOutliers.length; i++) {
        const coverId = helper.generateIdString("outlier-cover")
        labelsObj.label = container.append("div")
          .text(helper.formatValueForScale(isVertical.current, lowerOutliers[i]))
          .attr("class", "measure-tip measure-labels-tip box-plot-label")
          .attr("id", `${textId}-lower-outlier-${i}`)
          .attr("data-testid", `${textId}-${i}`)
        select(`#${coverId}-lower-${i}`)
          .on("mouseover", (e) => toggleBoxPlotLabels(`${textId}-lower-outlier-${i}`, true, e))
          .on("mouseout", (e) => toggleBoxPlotLabels(`${textId}-lower-outlier-${i}`, false, e))
          .on("click", (e) => selectRange([lowerOutliers[i], lowerOutliers[i]], e))
      }
      for (let i = 0; i < upperOutliers.length; i++) {
        const coverId = helper.generateIdString("outlier-cover")
        labelsObj.label = container.append("div")
          .text(helper.formatValueForScale(isVertical.current, upperOutliers[i]))
          .attr("class", "measure-tip measure-labels-tip box-plot-label")
          .attr("id", `${textId}-upper-outlier-${i}`)
          .attr("data-testid", `${textId}-${i}`)
        select(`#${coverId}-upper-${i}`)
          .on("mouseover", (e) => toggleBoxPlotLabels(`${textId}-upper-outlier-${i}`, true, e))
          .on("mouseout", (e) => toggleBoxPlotLabels(`${textId}-upper-outlier-${i}`, false, e))
          .on("click", (e) => selectRange([upperOutliers[i], upperOutliers[i]], e))
      }
    }
  }, [attrId, cellKey, dataConfig, helper, labelRef, model, toggleBoxPlotLabels])

  const addAdornmentElements = useCallback((valueObj: IBoxPlotValue, labelsObj: ILabel) => {

    const addMedian = () => {
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
    }

    if (!attrId || !dataConfig) return
    const value = model.getBoxPlotParams(cellKey).median
    if (value === undefined || isNaN(value)) return

    const { coords, coverClass, coverId, lineClass, lineId, measureRange } =
      helper.adornmentSpecs(attrId, dataConfig, value, isVertical.current, cellCounts, secondaryAxisX, secondaryAxisY)
    const { median, lowerQuartile, upperQuartile, iqr,
            minWhiskerValue, maxWhiskerValue } = model.getBoxPlotParams(cellKey)
    const translationVars = [ minWhiskerValue, lowerQuartile, median, upperQuartile, maxWhiskerValue, iqr ]
      .map(v => helper.formatValueForScale(isVertical.current, v))
    let textContent = `${t(model.labelTitle, { vars: translationVars })}`

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
      // As a result of the addRange call, valueObj.range will be the rectangle that covers the IQR
      helper.addRange(valueRef.current, valueObj, rangeSpecs)
      valueObj.range?.attr("style", "pointer-events: all")  // So we get mouseover events

      addMedian() // last so it's on top
    }
    addWhiskers(valueObj, measureRange, model.showOutliers)
    addQCovers(valueObj)
    if (model.showICI) {
      const iciRange = model.computeICIRange(attrId, cellKey, dataConfig)
      addICI(valueObj)
      textContent += `\n${t('ICI: [%@, %@]',
        { vars: [helper.formatValueForScale(isVertical.current, iciRange.min),
            helper.formatValueForScale(isVertical.current, iciRange.max)] })}`
    }
    addBoxPlotLabels(textContent, valueObj, labelsObj)
  }, [addBoxPlotLabels, addICI, addWhiskers, addQCovers, attrId, cellCounts, cellKey, dataConfig,
            helper, model, secondaryAxisX, secondaryAxisY])

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

  if (['linePlot', 'binnedDotPlot'].includes(graphModel.plot.type)) {
    return  // Don't display box plot adornments on binned dot plots or line plots
  }

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
