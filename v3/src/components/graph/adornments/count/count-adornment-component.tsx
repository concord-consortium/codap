import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { measureText } from "../../../../hooks/use-measure-text"
import { mstAutorun } from "../../../../utilities/mst-autorun"
import { mstReaction } from "../../../../utilities/mst-reaction"
import { prf } from "../../../../utilities/profiler"
import { useAdornmentAttributes } from "../../hooks/use-adornment-attributes"
import { useAdornmentCells } from "../../hooks/use-adornment-cells"
import { useGraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import { useGraphDataConfigurationContext } from "../../hooks/use-graph-data-configuration-context"
import { isBinnedDotPlotModel } from "../../plots/binned-dot-plot/binned-dot-plot-model"
import { percentString } from "../../utilities/graph-utils"
import { IAdornmentComponentProps } from "../adornment-component-info"
import { kDefaultFontSize } from "../adornment-types"
import { getAxisDomains } from "../utilities/adornment-utils"
import { ICountAdornmentModel, IRegionCount } from "./count-adornment-model"

import "./count-adornment-component.scss"

export const CountAdornment = observer(function CountAdornment(props: IAdornmentComponentProps) {
  prf.begin("CountAdornment.render")
  const { cellKey, plotHeight, plotWidth, xAxis, yAxis } = props
  const model = props.model as ICountAdornmentModel
  const { classFromKey, instanceKey } = useAdornmentCells(model, cellKey)
  const { xScale, yScale } = useAdornmentAttributes()
  const dataConfig = useGraphDataConfigurationContext()
  const graphModel = useGraphContentModelContext()
  const binnedDotPlot = isBinnedDotPlotModel(graphModel.plot) ? graphModel.plot : undefined
  const adornmentsStore = graphModel?.adornmentsStore
  const primaryAttrRole = dataConfig?.primaryRole ?? "x"
  const scale = primaryAttrRole === "x" ? xScale : yScale
  const casesInPlot =
    dataConfig?.filterCasesForDisplay(dataConfig?.subPlotCases(cellKey)).length ?? 0
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
      // access plot type so the autorun below is triggered when the plot type changes
      if (graphModel.plotType === "binnedDotPlot" && binnedDotPlot && dataConfig) {
        const { binWidth, minBinEdge, maxBinEdge, totalNumberOfBins } = binnedDotPlot.binDetails() ?? {}
        return binWidth !== undefined ? [
          // Build and spread an array of numeric values corresponding to the bin boundaries. Using totalNumberOfBins
          // for length, start at minBinEdge and increment by binWidth using each bin's index. Afterward, add
          // maxBinEdge to complete the region boundaries array.
          ...Array.from({ length: totalNumberOfBins }, (_, i) => minBinEdge + i * binWidth),
          maxBinEdge
        ] : []
      }
      return adornmentsStore?.subPlotRegionBoundaries(instanceKey) ?? []
  }, [adornmentsStore, binnedDotPlot, dataConfig, graphModel, instanceKey])

  const subPlotRegionBoundariesRef = useRef(subPlotRegionBoundaries())

  const regionText = useCallback((regionCount: Partial<IRegionCount>, regionIndex = 0) => {
    const regionPercent = percentString(
      model.percentValue(casesInPlot, cellKey, dataConfig, subPlotRegionBoundariesRef.current, regionIndex)
    )
    const regionDisplayPercent = model.showCount ? ` (${regionPercent})` : regionPercent
    return `${model.showCount ? regionCount.count : ""}${model.showPercent ? regionDisplayPercent : ""}`
  }, [casesInPlot, cellKey, dataConfig, model])

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

    const regionCounts = model.computeRegionCounts({
      cellKey,
      dataConfig,
      // Points whose values match a region's upper boundary are treated differently based on
      // what defines the regions. For regions defined by bins, points matching the upper boundary
      // are placed into the next bin. So we set `inclusiveMax` to false. Otherwise, such points
      // are considered within the boundary and `inclusiveMax` is true.
      inclusiveMax: !binnedDotPlot,
      plotHeight,
      plotWidth,
      scale,
      subPlotRegionBoundaries: subPlotRegionBoundariesRef.current
    })

    // If there are no bin boundaries or movable values present, we just show a single case count.
    if (regionCounts.length === 1) {
      const regionTextContent = regionText(regionCounts[0])
      setDisplayCount(
        <p>
          {regionTextContent}
        </p>
      )
    } else {
      setDisplayCount(
        <>
          {regionCounts.map((c: IRegionCount, i: number) => {
            const className = clsx("sub-count",
              {"x-axis": primaryAttrRole === "x"},
              {"y-axis": primaryAttrRole === "y"},
              {"binned-points-count": !!binnedDotPlot}
            )
            const style = primaryAttrRole === "x"
              ? { left: `${c.leftOffset}px`, width: `${c.width}px` }
              : { bottom: `${c.bottomOffset}px`, height: `${c.height}px` }
            const regionTextContent = regionText(c, i)
            return (
              <div key={`count-instance-${i}`} className={className} style={style}>
                {regionTextContent}
              </div>
            )
          })}
        </>
      )
    }
  }, [binnedDotPlot, cellKey, dataConfig, model, plotHeight, plotWidth, primaryAttrRole, regionText, scale])

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
      }, { name: "Count.refreshBoundariesAndCaseCounts" }, [model, xAxis, yAxis])
  }, [model, plotCaseCounts, subPlotRegionBoundaries, xAxis, yAxis])

  useEffect(function refreshOnSubPlotRegionChange() {
    return mstReaction(
      () => binnedDotPlot?.binWidth,
      () => {
        if (binnedDotPlot) {
          resizeText()
          prevSubPlotRegionWidth.current = plotWidth / subPlotRegionBoundariesRef.current.length
        }
      }, { name: "CountAdornment.refreshOnSubPlotRegionChange" }, binnedDotPlot
    )
  }, [binnedDotPlot, plotWidth, resizeText])

  useEffect(function refreshShowPercentOption() {
    return mstAutorun(
      () => {
        // set showPercent to false if attributes change to a configuration that doesn't support percent
        const shouldShowPercentOption = !!dataConfig?.categoricalAttrCount || adornmentsStore.subPlotsHaveRegions ||
                                        !!binnedDotPlot
        if (!shouldShowPercentOption && model?.showPercent) {
          graphModel.applyModelChange(() => {
            model.setShowPercent(false)
          }, {
            undoStringKey: "DG.Undo.graph.hidePercent",
            redoStringKey: "DG.Redo.graph.hidePercent",
            log: "Hide percent adornment"
          })
        }
     }, { name: "CountAdornment.refreshPercentOption"}, model)
  }, [adornmentsStore, binnedDotPlot, dataConfig, graphModel, model])
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
