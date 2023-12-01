import { useGraphDataConfigurationContext } from "./use-graph-data-configuration-context"
import { useGraphLayoutContext } from "./use-graph-layout-context"

export function useAdornmentCategories() {
  const dataConfig = useGraphDataConfigurationContext()
  const layout = useGraphLayoutContext()
  const xAttrType = dataConfig?.attributeType("x")
  const yAttrType = dataConfig?.attributeType("y")
  const xSubAxesCount = layout.getAxisMultiScale("bottom")?.repetitions ?? 1
  const ySubAxesCount = layout.getAxisMultiScale("left")?.repetitions ?? 1
  const xCatSet = layout.getAxisMultiScale("bottom")?.categorySet
  const xCats = xAttrType === "categorical" && xCatSet ? Array.from(xCatSet.values) : [""]
  const yCatSet = layout.getAxisMultiScale("left")?.categorySet
  const yCats = yAttrType === "categorical" && yCatSet ? Array.from(yCatSet.values) : [""]
  return { xSubAxesCount, ySubAxesCount, xCats, yCats }
}
