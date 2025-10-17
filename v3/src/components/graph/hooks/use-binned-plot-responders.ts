import { comparer, observable, runInAction } from "mobx"
import { useEffect } from "react"
import { useMemo } from "use-memo-one"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { mstReaction } from "../../../utilities/mst-reaction"
import { isBinnedPlotModel } from "../plots/histogram/histogram-model"
import { useGraphContentModelContext } from "./use-graph-content-model-context"

export const useBinnedPlotResponders = (refreshFn: (selected: boolean) => void) => {
  const graphModel = useGraphContentModelContext()
  const dataset = useDataSetContext()

  // stash the current refresh function in a MobX observable property
  const observableRefreshFn = useMemo(() => observable.box<Maybe<(selected: boolean) => void>>(), [])

  // update the observable property when the refresh function changes
  useEffect(() => {
    if (refreshFn !== observableRefreshFn.get()) {
      runInAction(() => {
        observableRefreshFn.set(refreshFn)
      })
    }
  }, [observableRefreshFn, refreshFn])

  // Respond to binAlignment, binWidth, and refresh function changes
  useEffect(function respondToGraphBinSettings() {
    return mstReaction(
      () => {
        const plot = graphModel.plot
        return isBinnedPlotModel(plot) ? [plot.binAlignment, plot.binWidth, observableRefreshFn.get()] as const : []
      },
      ([binAlignment, binWidth, _refreshFn]) => _refreshFn?.(false),
      {name: "respondToGraphBinSettings", equals: comparer.structural}, [graphModel, graphModel.plot])
  }, [dataset, graphModel, observableRefreshFn])
}
