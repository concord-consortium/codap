import React, { useCallback, useEffect, useRef, useState } from "react"
import { observer } from "mobx-react-lite"
import { clsx } from "clsx"
import { mstAutorun } from "../../../../utilities/mst-autorun"
import { mstReaction } from "../../../../utilities/mst-reaction"
import { IAdornmentComponentProps } from "../adornment-component-info"
import { getAxisDomains } from "../adornment-utils"
import { ICountAdornmentModel, IRegionCount, IRegionCountParams } from "./count-adornment-model"
import { useGraphDataConfigurationContext } from "../../hooks/use-graph-data-configuration-context"
import { useAdornmentCells } from "../../hooks/use-adornment-cells"
import { useAdornmentAttributes } from "../../hooks/use-adornment-attributes"
import { percentString } from "../../utilities/graph-utils"
import { prf } from "../../../../utilities/profiler"
import { measureText } from "../../../../hooks/use-measure-text"
import { useGraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import { kDefaultFontSize } from "../adornment-types"

import "./count-adornment-component.scss"

export const CountAdornment = observer(function CountAdornment(props: IAdornmentComponentProps) {
  prf.begin("CountAdornment.render")
  const { cellKey, plotHeight, plotWidth, xAxis, yAxis } = props
  const model = props.model as ICountAdornmentModel
  const { classFromKey, instanceKey } = useAdornmentCells(model, cellKey)
  const { xScale, yScale } = useAdornmentAttributes()
  const dataConfig = useGraphDataConfigurationContext()
  const graphModel = useGraphContentModelContext()
  const adornmentsStore = graphModel?.adornmentsStore
  const primaryAttrRole = dataConfig?.primaryRole ?? "x"
  const scale = primaryAttrRole === "x" ? xScale : yScale
  const casesInPlot = dataConfig?.subPlotCases(cellKey)?.length ?? 0
  const percent = model.percentValue(casesInPlot, cellKey, dataConfig)
  const displayPercent = model.showCount ? ` (${percentString(percent)})` : percentString(percent)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const rerenderOnCasesChange = dataConfig?.casesChangeCount
  const textContent = `${model.showCount ? casesInPlot : ""}${model.showPercent ? displayPercent : ""}`
  const defaultFontSize = graphModel.adornmentsStore.defaultFontSize
  let fontSize = defaultFontSize
  const prevCellWidth = useRef(plotWidth)
  const prevSubPlotRegionWidth = useRef(plotWidth)
  const [displayCount, setDisplayCount] = useState(<div>{textContent}</div>)

  const subPlotRegionBoundaries = useCallback(() => {
      // Sub plot regions can be defined by either bin boundaries when points are grouped into bins, or by
      // instances of the movable value adornment. It should not be possible to have both bin boundaries and
      // movable values present at the same time.
      if (graphModel.pointDisplayType === "bins") {
        const { binWidth, minBinEdge, maxBinEdge, totalNumberOfBins } = graphModel.binDetails()
        return [
          // Build and spread an array of numeric values corresponding to the bin boundaries. Using totalNumberOfBins
          // for length, start at minBinEdge and increment by binWidth using each bin's index. Afterward, add
          // maxBinEdge to complete the region boundaries array.
          ...Array.from({ length: totalNumberOfBins }, (_, i) => minBinEdge + i * binWidth),
          maxBinEdge
        ]
      }
      return adornmentsStore?.subPlotRegionBoundaries(instanceKey, scale) ?? []
  }, [adornmentsStore, graphModel, instanceKey, scale])

  const subPlotRegionBoundariesRef = useRef(subPlotRegionBoundaries())

  const resizeText = useCallback(() => {
    const minFontSize = 3
    const maxFontSize = kDefaultFontSize
    const textOffset = 5
    const textWidth = measureText(textContent, `${fontSize}px Lato, sans-serif`) + textOffset
    const subPlotRegionWidth = plotWidth / subPlotRegionBoundariesRef.current.length
    const textWidthIsTooWide = textWidth > plotWidth || textWidth > subPlotRegionWidth
    const isContainerShrinking = prevCellWidth.current > plotWidth ||
                                 prevSubPlotRegionWidth.current > subPlotRegionWidth
    const isContainerGrowing = prevCellWidth.current < plotWidth ||
                               prevSubPlotRegionWidth.current < subPlotRegionWidth

    if (isContainerShrinking && textWidthIsTooWide && fontSize > minFontSize) {
      fontSize--
    } else if (isContainerGrowing && !textWidthIsTooWide && fontSize < maxFontSize) {
      fontSize++
    }

    if (fontSize !== defaultFontSize) {
      graphModel.adornmentsStore.setDefaultFontSize(fontSize)
    }
  }, [defaultFontSize, fontSize, graphModel.adornmentsStore, plotWidth, textContent])

  const plotCaseCounts = useCallback(() => {
    // If the graph's points have been grouped into bins, we need to show the case count within each bin.
    //
    // If there are movable values present, we need to show the case count within each sub-plot region defined by the
    // movable values and the min and max of the primary axis. For example, if there is one movable value, the sub-plot
    // will have two regions, one from the axis' min value to the movable value, and another from the movable value
    // to the axis' max value.
    //
    // It should not be possible to have both bin boundaries and movable values present at the same time.

    if (subPlotRegionBoundariesRef.current.length < 3 || graphModel.plotType !== "dotPlot") {
      // If there are no bin boundaries or movable values present, we just show a single case count.
      setDisplayCount(<div>{textContent}</div>)
      return
    }

    const regionCountParams: IRegionCountParams = {
      cellKey,
      dataConfig,
      // Points whose values match a region's upper boundary are treated differently based on what defines the regions.
      // For regions defined by bins, points matching the upper boundary are placed into the next bin. So we set
      // `inclusiveMax` to false. Otherwise, such points are considered within the boundary and `inclusiveMax` is true.
      inclusiveMax: graphModel.pointDisplayType !== "bins",
      plotHeight,
      plotWidth,
      scale,
      subPlotRegionBoundaries: subPlotRegionBoundariesRef.current,
    }
    const counts: IRegionCount[] = model.regionCounts(regionCountParams)
    const className = clsx("sub-count",
      {"x-axis": primaryAttrRole === "x"},
      {"y-axis": primaryAttrRole === "y"},
      {"binned-points-count": graphModel.pointDisplayType === "bins"}
    )
    setDisplayCount(
      <>
        {counts.map((c, i) => {
          const style = primaryAttrRole === "x"
            ? { left: `${c.leftOffset}px`, width: `${c.width}px` }
            : { bottom: `${c.bottomOffset}px`, height: `${c.height}px` }
          const regionPercent = percentString(c.count / casesInPlot)
          const regionDisplayPercent = model.showCount ? ` (${regionPercent})` : regionPercent
          const regionTextContent = `${model.showCount ? c.count : ""}${model.showPercent ? regionDisplayPercent : ""}`

          return <div key={`count-instance-${i}`} className={className} style={style}>{regionTextContent}</div>
        })}
      </>
    )
  }, [casesInPlot, cellKey, dataConfig, graphModel.plotType, graphModel.pointDisplayType, model, plotHeight,
      plotWidth, primaryAttrRole, scale, textContent])

  useEffect(function resizeTextOnCellWidthChange() {
    return mstAutorun(() => {
      resizeText()
      prevCellWidth.current = plotWidth
    }, { name: "CountAdornmentComponent.resizeTextOnCellWidthChange" }, model)
  }, [model, plotWidth, resizeText])

  useEffect(function refreshBoundariesAndCaseCounts() {
    return mstAutorun(
      () => {
        getAxisDomains(xAxis, yAxis)
        subPlotRegionBoundariesRef.current = subPlotRegionBoundaries()
        plotCaseCounts()
      }, { name: "Count.refreshBoundariesAndCaseCounts" }, model)
  }, [model, plotCaseCounts, subPlotRegionBoundaries, xAxis, yAxis])

  useEffect(function refreshOnSubPlotRegionChange() {
    return mstReaction(
      () => graphModel.binWidth,
      () => {
        if (graphModel.pointDisplayType === "bins") {
          resizeText()
          prevSubPlotRegionWidth.current = plotWidth / subPlotRegionBoundariesRef.current.length
        }
      }, { name: "CountAdornment.refreshOnSubPlotRegionChange" }, graphModel
    )
  }, [graphModel, plotWidth, resizeText])

  useEffect(function refreshShowPercentOption() {
    return mstAutorun(
      () => {
        // set showPercent to false if attributes change to a configuration that doesn't support percent
        const shouldShowPercentOption = !!dataConfig?.categoricalAttrCount || adornmentsStore.subPlotsHaveRegions ||
                                        graphModel.pointDisplayType === "bins"
        if (!shouldShowPercentOption && model?.showPercent) {
          model.setShowPercent(false)
        }
     }, { name: "CountAdornment.refreshPercentOption"}, model)
  }, [adornmentsStore, dataConfig, graphModel, model])
  prf.end("CountAdornment.render")
  return (
    <div
      className="graph-count"
      data-testid={`graph-count${classFromKey ? `-${classFromKey}` : ""}`}
      style={{fontSize: `${fontSize}px`}}
    >
      {displayCount}
    </div>
  )
})
