import React, { useEffect } from "react"
import { autorun } from "mobx"
import { observer } from "mobx-react-lite"
import { ICountAdornmentModel } from "./count-adornment-model"
import { useGraphDataConfigurationContext } from "../../hooks/use-graph-data-configuration-context"
import { percentString } from "../../utilities/graph-utils"
import { prf } from "../../../../utilities/profiler"

import "./count-adornment-component.scss"

interface IProps {
  model: ICountAdornmentModel
  cellKey: Record<string, string>
}

export const CountAdornment = observer(function CountAdornment({model, cellKey}: IProps) {
  prf.begin("CountAdornment.render")
  const classFromKey = model.classNameFromKey(cellKey)
  const dataConfig = useGraphDataConfigurationContext()
  const casesInPlot = dataConfig?.subPlotCases(cellKey)?.length ?? 0
  const percent = model.percentValue(casesInPlot, cellKey, dataConfig)
  const displayPercent = model.showCount ? ` (${percentString(percent)})` : percentString(percent)

  useEffect(() => {
    return autorun(() => {
      prf.begin("CountAdornment.autorun")
      const shouldShowPercentOption = dataConfig ? dataConfig.categoricalAttrCount > 0 : false
      const shouldShowPercentTypeOptions = dataConfig?.hasExactlyTwoPerpendicularCategoricalAttrs

      // set percentType to 'cell' if attributes change to a configuration that doesn't support 'row' or 'column'
      if (!shouldShowPercentTypeOptions && model?.percentType !== "cell") {
        model.setPercentType("cell")
      }

      // set showPercent to false if attributes change to a configuration that doesn't support percent
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
