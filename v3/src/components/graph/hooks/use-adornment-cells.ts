import { IAdornmentModel } from "../adornments/adornment-models"
import { useGraphDataConfigurationContext } from "./use-graph-data-configuration-context"
import { useGraphLayoutContext } from "./use-graph-layout-context"

export function useAdornmentCells(model: IAdornmentModel, cellKey: Record<string, string>) {
  const dataConfig = useGraphDataConfigurationContext()
  const layout = useGraphLayoutContext()
  const classFromKey = model.classNameFromKey(cellKey)
  const instanceKey = model.instanceKey(cellKey)
  const xAttrType = dataConfig?.attributeType("x")
  const yAttrType = dataConfig?.attributeType("y")
  const cellCounts = model.cellCount(layout, xAttrType, yAttrType)
  return { classFromKey, cellCounts, instanceKey }
}
