import React, { useCallback, useEffect, useRef } from "react"
import { observer } from "mobx-react-lite"
import { ICountAdornmentModel } from "./count-adornment-model"
import { useGraphDataConfigurationContext } from "../../hooks/use-graph-data-configuration-context"
import { useAdornmentCells } from "../../hooks/use-adornment-cells"
import { percentString } from "../../utilities/graph-utils"
import { prf } from "../../../../utilities/profiler"
import { measureText } from "../../../../hooks/use-measure-text"
import { useGraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import { mstAutorun } from "../../../../utilities/mst-autorun"
import { kDefaultFontSize } from "../adornment-types"

import "./count-adornment-component.scss"

interface IProps {
  cellKey: Record<string, string>
  model: ICountAdornmentModel
  plotWidth: number
}

export const CountAdornment = observer(function CountAdornment({ model, cellKey, plotWidth }: IProps) {
  prf.begin("CountAdornment.render")
  const { classFromKey } = useAdornmentCells(model, cellKey)
  const dataConfig = useGraphDataConfigurationContext()
  const graphModel = useGraphContentModelContext()
  const casesInPlot = dataConfig?.subPlotCases(cellKey)?.length ?? 0
  const percent = model.percentValue(casesInPlot, cellKey, dataConfig)
  const displayPercent = model.showCount ? ` (${percentString(percent)})` : percentString(percent)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const rerenderOnCasesChange = dataConfig?.casesChangeCount
  const textContent = `${model.showCount ? casesInPlot : ""}${model.showPercent ? displayPercent : ""}`
  const defaultFontSize = graphModel.adornmentsStore.defaultFontSize
  let fontSize = defaultFontSize
  const prevCellWidth = useRef(plotWidth)

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

  useEffect(function resizeTextOnCellWidthChange() {
    return mstAutorun(() => {
      resizeText()
      prevCellWidth.current = plotWidth
    }, { name: "CountAdornmentComponent.resizeTextOnCellWidthChange" }, model)
  }, [model, plotWidth, resizeText])

  useEffect(() => {
    return mstAutorun(function setShowPercentOption() {
      prf.begin("CountAdornment.autorun")
      // set showPercent to false if attributes change to a configuration that doesn't support percent
      const shouldShowPercentOption = !!dataConfig?.categoricalAttrCount
      if (!shouldShowPercentOption && model?.showPercent) {
        model.setShowPercent(false)
      }
      prf.end("CountAdornment.autorun")
    }, { name: "CountAdornmentComponent.setShowPercentOption" }, model)
  }, [dataConfig, model])
  prf.end("CountAdornment.render")
  return (
    <div
      className="graph-count"
      data-testid={`graph-count${classFromKey ? `-${classFromKey}` : ""}`}
      style={{fontSize: `${fontSize}px`}}
    >
      {textContent}
    </div>
  )
})
