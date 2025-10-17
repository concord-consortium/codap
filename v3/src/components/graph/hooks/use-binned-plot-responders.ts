import { comparer } from "mobx"
import { useEffect } from "react"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { mstReaction } from "../../../utilities/mst-reaction"
import { isBinnedPlotModel } from "../plots/histogram/histogram-model"
import { useGraphContentModelContext } from "./use-graph-content-model-context"

export const useBinnedPlotResponders = (
  refreshPointPositionsRef:  React.MutableRefObject<(selectedOnly: boolean) => void>) => {
  const graphModel = useGraphContentModelContext()
  const dataset = useDataSetContext()

  // Respond to binAlignment and binWidth changes
  useEffect(function respondToGraphBinSettings() {
    return mstReaction(
      () => {
        const plot = graphModel.plot
        return isBinnedPlotModel(plot) ? [plot.binAlignment, plot.binWidth] : []
      },
      () => {
        refreshPointPositionsRef.current(false)
      },
      {name: "respondToGraphBinSettings", equals: comparer.structural},
      [graphModel, graphModel.plot])
  }, [dataset, graphModel, refreshPointPositionsRef])
}
