import { useGraphDataConfigurationContext } from "./use-graph-data-configuration-context"
import { useGraphLayoutContext } from "./use-graph-layout-context"

export function useAdornmentCategories() {
  const dataConfig = useGraphDataConfigurationContext()
  const layout = useGraphLayoutContext()
  const xAttrType = dataConfig?.attributeType("x")
  const yAttrType = dataConfig?.attributeType("y")
  const xSubAxesCount = layout.getAxisMultiScale("bottom")?.repetitions ?? 1
  const ySubAxesCount = layout.getAxisMultiScale("left")?.repetitions ?? 1
  const xCatValues = layout.getAxisMultiScale("bottom")?.categoryValues
  const xCats = xAttrType === "categorical" && xCatValues ? xCatValues : [""]
  const yCatValues = layout.getAxisMultiScale("left")?.categoryValues
  const yCats = yAttrType === "categorical" && yCatValues ? yCatValues : [""]
  return { xSubAxesCount, ySubAxesCount, xCats, yCats }
}
