import { observer } from "mobx-react-lite"
import React from "react"
import { PlotProps } from "../graphing-types"
import { useGraphContentModelContext } from "../hooks/use-graph-content-model-context"
import { BinnedDotPlotDots } from "./binneddotplotdots"
import { FreeDotPlotDots } from "./freedotplotdots"

export const DotPlotDots = observer(function DotPlotDots(props: PlotProps) {
  const { pixiPoints, abovePointsGroupRef } = props
  const graphModel = useGraphContentModelContext()
  const pointDisplayType = graphModel.pointDisplayType

  const plotComponent = pointDisplayType === "bins"
    ? <BinnedDotPlotDots pixiPoints={pixiPoints} abovePointsGroupRef={abovePointsGroupRef}  />
    : <FreeDotPlotDots pixiPoints={pixiPoints} />

  return plotComponent
})
