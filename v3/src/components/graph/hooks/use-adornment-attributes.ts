import { useRef } from "react"
import { ScaleNumericBaseType } from "../../axis/axis-types"
import { useGraphDataConfigurationContext } from "./use-graph-data-configuration-context"
import { useGraphLayoutContext } from "./use-graph-layout-context"
import { useGraphContentModelContext } from "./use-graph-content-model-context"

export const useAdornmentAttributes = () => {
  const graphModel = useGraphContentModelContext()
  const dataConfig = useGraphDataConfigurationContext()
  const layout = useGraphLayoutContext()
  const adornmentsStore = graphModel.adornmentsStore
  const xAttrType = dataConfig?.attributeType("x")
  const xScale = layout.getAxisScale("bottom") as ScaleNumericBaseType
  const yScale = layout.getAxisScale("left") as ScaleNumericBaseType
  const allAttributes = dataConfig?.dataset?.attributes
  const xAttrId = dataConfig?.attributeID("x") || ""
  const yAttrId = dataConfig?.attributeID("y") || ""
  const numericAttrId = xAttrId && xAttrType === "numeric" ? xAttrId : yAttrId
  const xAttr = allAttributes?.find(attr => attr.id === xAttrId)
  const yAttr = allAttributes?.find(attr => attr.id === yAttrId)
  const xAttrName = xAttr?.name ?? ""
  const yAttrName = yAttr?.name ?? ""
  const showLabel = adornmentsStore?.showMeasureLabels
  const isVertical = useRef(!!(xAttrType && xAttrType === "numeric"))
  const valueRef = useRef<SVGGElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)

  return { graphModel, dataConfig, layout, adornmentsStore, xAttrType, xAttrId, yAttrId, xAttrName, yAttrName,
    numericAttrId, xScale, yScale, showLabel, isVertical, valueRef, labelRef }
}
