import React, { useEffect } from "react"
import { autorun } from "mobx"
import { observer } from "mobx-react-lite"
import { ICountAdornmentModel } from "./count-adornment-model"
import { useGraphDataConfigurationContext } from "../../hooks/use-graph-data-configuration-context"
import { useAdornmentCells } from "../../hooks/use-adornment-cells"
import { percentString } from "../../utilities/graph-utils"
import { prf } from "../../../../utilities/profiler"

import "./count-adornment-component.scss"

interface IProps {
  model: ICountAdornmentModel
  cellKey: Record<string, string>
}

export const CountAdornment = observer(function CountAdornment({model, cellKey}: IProps) {
  prf.begin("CountAdornment.render")
  const { classFromKey } = useAdornmentCells(model, cellKey)
  const dataConfig = useGraphDataConfigurationContext()
  const casesInPlot = dataConfig?.subPlotCases(cellKey)?.length ?? 0
  const percent = model.percentValue(casesInPlot, cellKey, dataConfig)
  const displayPercent = model.showCount ? ` (${percentString(percent)})` : percentString(percent)

  useEffect(() => {
    return autorun(() => {
      prf.begin("CountAdornment.autorun")
      // set showPercent to false if attributes change to a configuration that doesn't support percent
      const shouldShowPercentOption = !!dataConfig?.categoricalAttrCount
      if (!shouldShowPercentOption && model?.showPercent) {
        model.setShowPercent(false)
      }
      prf.end("CountAdornment.autorun")
    })
  }, [dataConfig, model])
  prf.end("CountAdornment.render")
  return (
    <div className="graph-count" data-testid={`graph-count${classFromKey ? `-${classFromKey}` : ""}`}>
      {model.showCount && casesInPlot}
      {model.showPercent && displayPercent}
    </div>
  )
})
