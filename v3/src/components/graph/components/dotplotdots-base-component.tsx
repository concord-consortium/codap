import { observer } from "mobx-react-lite"
import React from "react"
import { PlotProps } from "../graphing-types"
import { useGraphContentModelContext } from "../hooks/use-graph-content-model-context"
import { BinnedDotPlotDots } from "./binneddotplotdots"
import { DotPlotDots } from "./dotplotdots"

export const DotPlotDotsBaseComponent = observer(function DotPlotDotsBaseComponent(props: PlotProps) {
  const { pixiPointsRef } = props
  const graphModel = useGraphContentModelContext()
  const pointDisplayType = graphModel.pointDisplayType

  const plotComponent = pointDisplayType === "bins"
    ? <BinnedDotPlotDots pixiPointsRef={pixiPointsRef} />
    : <DotPlotDots pixiPointsRef={pixiPointsRef} />

  return plotComponent
})
