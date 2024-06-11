import { useEffect } from "react"
import { mstReaction } from "../../../utilities/mst-reaction"
import { comparer } from "mobx"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { useGraphContentModelContext } from "./use-graph-content-model-context"
import { useGraphDataConfigurationContext } from "./use-graph-data-configuration-context"

export const useDotPlotResponders = (refreshPointPositions: (selected: boolean) => void) => {
  const graphModel = useGraphContentModelContext()
  const dataset = useDataSetContext()
  const dataConfig = useGraphDataConfigurationContext()

  // Respond to binAlignment and binWidth changes. We include both the volatile and non-volatile versions of these
  // properties. Changes to the volatile versions occur during bin boundary dragging and result in the appropriate
  // behavior during a drag. Changes to the non-volatile versions occur when a drag ends (or the user sets the bin
  // and alignment values via the form fields) and result in the behavior required when bin boundary dragging ends.
  useEffect(function respondToGraphBinSettings() {
    return mstReaction(
      () => [graphModel._binAlignment, graphModel._binWidth, graphModel.binAlignment, graphModel.binWidth],
      () => refreshPointPositions(false),
      {name: "respondToGraphBinSettings", equals: comparer.structural}, graphModel)
  }, [dataset, graphModel, refreshPointPositions])

  // Initialize binWidth and binAlignment on the graph model if they haven't been defined yet.
  // This can happen when a CODAP document containing a graph with binned points is imported.
  useEffect(function setInitialBinSettings() {
    if (!dataConfig) return
    if (graphModel.binWidth === undefined || graphModel.binAlignment === undefined) {
      const { binAlignment, binWidth } = graphModel.binDetails({ initialize: true })
      graphModel.applyModelChange(() => {
        graphModel.setBinWidth(binWidth)
        graphModel.setBinAlignment(binAlignment)
      })
    }
  })
}
