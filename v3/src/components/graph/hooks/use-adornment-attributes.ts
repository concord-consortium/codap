import { ScaleNumericBaseType } from "../../axis/axis-types"
import { useGraphDataConfigurationContext } from "./use-graph-data-configuration-context"
import { useGraphLayoutContext } from "./use-graph-layout-context"

export const useAdornmentAttributes = () => {
  const dataConfig = useGraphDataConfigurationContext()
  const layout = useGraphLayoutContext()
  const xAttrType = dataConfig?.attributeType("x")
  const xScale = layout.getAxisScale("bottom") as ScaleNumericBaseType
  const yScale = layout.getAxisScale("left") as ScaleNumericBaseType
  const allAttributes = dataConfig?.dataset?.attributes
  const xAttrId = dataConfig?.attributeID("x") || ""
  const yAttrId = dataConfig?.attributeID("y") || ""
  const xAttr = allAttributes?.find(attr => attr.id === xAttrId)
  const yAttr = allAttributes?.find(attr => attr.id === yAttrId)
  const xAttrName = xAttr?.name ?? ""
  const yAttrName = yAttr?.name ?? ""

  return { xAttrId, yAttrId, xAttrName, yAttrName, xAttrType, xScale, yScale }
}
