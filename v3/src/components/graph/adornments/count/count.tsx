import React, { useEffect } from "react"
import { observer } from "mobx-react-lite"
import { ICountModel } from "./count-model"
import { useDataConfigurationContext } from "../../hooks/use-data-configuration-context"

import "./count.scss"

interface IProps {
  model: ICountModel
  cellKey: Record<string, string>
}

export const Count = observer(function Count({model, cellKey}: IProps) {
  const classFromKey = model.classNameFromKey(cellKey)
  const dataConfig = useDataConfigurationContext()
  const casesInPlot = dataConfig?.subPlotCases(cellKey)?.length ?? 0
  const percent = model.percentValue(dataConfig, casesInPlot, cellKey)
  const displayPercent = model.showCount ? ` (${percent}%)` : `${percent}%`
  const shouldShowPercentOption = dataConfig?.categoricalAttrCount ? dataConfig?.categoricalAttrCount() > 0 : false
  const shouldShowPercentTypeOptions = dataConfig?.hasExactlyTwoPerpendicularCategoricalAttrs()

  useEffect(() => {
    // set percentType to 'cell' if attributes change to a configuration that doesn't support 'row' or 'column'
    if (!shouldShowPercentTypeOptions) {
      model.setPercentType("cell")
    }

    // set showPercent to false if attributes change to a configuration that doesn't support percent
    if (!shouldShowPercentOption) {
      model.setShowPercent(false)
    }
  }, [dataConfig, model, shouldShowPercentOption, shouldShowPercentTypeOptions])

  return (
    <div className="graph-count" data-testid={`graph-count${classFromKey ? `-${classFromKey}` : ""}`}>
      {model.showCount && casesInPlot}
      {model.showPercent && displayPercent}
    </div>
  )
})
