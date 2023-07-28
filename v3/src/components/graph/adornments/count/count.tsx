import React from "react"
import { observer } from "mobx-react-lite"
import { ICountModel } from "./count-model"
import { useDataConfigurationContext } from "../../hooks/use-data-configuration-context"

import "./count.scss"

interface IProps {
  model: ICountModel
  subPlotKey: Record<string, string>
}

export const Count = observer(function Count({model, subPlotKey}: IProps) {
  const dataConfig = useDataConfigurationContext()
  const casesInPlot = dataConfig?.subPlotCases(subPlotKey)?.length ?? 0

  return (
    <div className="graph-count" data-testid="graph-count">
      {casesInPlot}
    </div>
  )
})
