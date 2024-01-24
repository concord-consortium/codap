import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { observer } from "mobx-react-lite"
import { mstAutorun } from "../../../../utilities/mst-autorun"
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
  const subPlotRegionBoundaries = useMemo(
    () => adornmentsStore?.subPlotRegionBoundaries(instanceKey, scale) ?? [],
    [adornmentsStore, instanceKey, scale]
  )
  const subPlotRegionBoundariesRef = useRef(subPlotRegionBoundaries)
  const [displayCount, setDisplayCount] = useState(<div>{textContent}</div>)

  const resizeText = useCallback(() => {
    const minFontSize = 3
    const maxFontSize = kDefaultFontSize
    const textOffset = 5
    const textWidth = measureText(textContent, `${fontSize}px Lato, sans-serif`) + textOffset

    if (prevCellWidth.current > plotWidth && textWidth > plotWidth && fontSize > minFontSize) {
      fontSize--
    } else if (prevCellWidth.current < plotWidth && textWidth < plotWidth && fontSize < maxFontSize) {
      fontSize++
    }

    if (fontSize !== defaultFontSize) {
      graphModel.adornmentsStore.setDefaultFontSize(fontSize)
    }
  }, [defaultFontSize, fontSize, graphModel.adornmentsStore, plotWidth, textContent])

  const plotCaseCounts = useCallback(() => {
    // If there are movable values present, we need to show the case count within each sub-plot region defined by the
    // movable values and the min and max of the primary axis. For example, if there is one movable value, the sub-plot
    // will have two regions, one from the axis' min value to the movable value, and another from the movable value
    // to the axis' max value.

    if (subPlotRegionBoundariesRef.current.length < 3 || graphModel.plotType !== "dotPlot") {
      // If there are no movable values present, we just show a single case count.
      setDisplayCount(<div>{textContent}</div>)
      return
    }

    const regionCountParams: IRegionCountParams = {
      cellKey,
      dataConfig,
      plotHeight,
      plotWidth,
      scale,
      subPlotRegionBoundaries: subPlotRegionBoundariesRef.current,
    }
    const counts: IRegionCount[] = model.regionCounts(regionCountParams)
    const className = primaryAttrRole === "x" ? "sub-count x-axis" : "sub-count y-axis"
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
  }, [casesInPlot, cellKey, dataConfig, graphModel.plotType, model, plotHeight, plotWidth, primaryAttrRole,
      scale, textContent])

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
        subPlotRegionBoundariesRef.current = adornmentsStore?.subPlotRegionBoundaries(instanceKey, scale) ?? []
        plotCaseCounts()
      }, { name: "Count.refreshBoundariesAndCaseCounts" }, model)
  }, [adornmentsStore, instanceKey, model, plotCaseCounts, plotHeight, plotWidth, scale, xAxis, yAxis])

  useEffect(function refreshShowPercentOption() {
    return mstAutorun(
      () => {
        // set showPercent to false if attributes change to a configuration that doesn't support percent
        const shouldShowPercentOption = !!dataConfig?.categoricalAttrCount || adornmentsStore.subPlotsHaveRegions
        if (!shouldShowPercentOption && model?.showPercent) {
          model.setShowPercent(false)
        }
     }, { name: "CountAdornment.refreshPercentOption"}, model)
  }, [adornmentsStore.subPlotsHaveRegions, dataConfig, model])
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
