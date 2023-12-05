import { useGraphDataConfigurationContext } from "./use-graph-data-configuration-context"
import { useGraphLayoutContext } from "./use-graph-layout-context"

export const useSubplotExtent = () => {
  const layout = useGraphLayoutContext()
  const dataConfig = useGraphDataConfigurationContext()
  const numExtraPrimaryBands = dataConfig?.numRepetitionsForPlace("bottom") ?? 1
  const numExtraSecondaryBands = dataConfig?.numRepetitionsForPlace("left") ?? 1
  const subPlotWidth = layout.plotWidth / numExtraPrimaryBands
  const subPlotHeight = layout.plotHeight / numExtraSecondaryBands
  return { subPlotWidth, subPlotHeight }
}
