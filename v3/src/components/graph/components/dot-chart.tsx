import { observer } from "mobx-react-lite"
import React from "react"
import { PlotProps } from "../graphing-types"
import { useGraphContentModelContext } from "../hooks/use-graph-content-model-context"
import { DotChartBars } from "./dot-chart-bars"
import { DotChartPoints } from "./dot-chart-points"

export const DotChart = observer(function DotChart(props: PlotProps) {
  const { pixiPoints, abovePointsGroupRef } = props
  const graphModel = useGraphContentModelContext()

  return graphModel.pointsFusedIntoBars
    ? <DotChartBars pixiPoints={pixiPoints} abovePointsGroupRef={abovePointsGroupRef}  />
    : <DotChartPoints pixiPoints={pixiPoints} />
})
