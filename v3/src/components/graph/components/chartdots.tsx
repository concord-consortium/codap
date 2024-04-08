import { observer } from "mobx-react-lite"
import React from "react"
import { PlotProps } from "../graphing-types"
import { useGraphContentModelContext } from "../hooks/use-graph-content-model-context"
import { BarChartDots } from "./barchartdots"
import { PointChartDots } from "./pointchartdots"

export const ChartDots = observer(function ChartDots(props: PlotProps) {
  const { pixiPoints, abovePointsGroupRef } = props
  const graphModel = useGraphContentModelContext()

  return graphModel.pointsFusedIntoBars
    ? <BarChartDots pixiPoints={pixiPoints} abovePointsGroupRef={abovePointsGroupRef}  />
    : <PointChartDots pixiPoints={pixiPoints} />
})
