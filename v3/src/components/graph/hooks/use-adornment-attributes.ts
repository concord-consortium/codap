import { useCallback, useRef } from "react"
import { ScaleNumericBaseType } from "../../axis/axis-types"
import { IAdornmentModel } from "../adornments/adornment-models"
import { useGraphOptions } from "../adornments/hooks/use-graph-options"
import { useGraphContentModelContext } from "./use-graph-content-model-context"
import { useGraphDataConfigurationContext } from "./use-graph-data-configuration-context"
import { useGraphLayoutContext } from "./use-graph-layout-context"

export const useAdornmentAttributes = () => {
  const graphModel = useGraphContentModelContext()
  const dataConfig = useGraphDataConfigurationContext()
  const layout = useGraphLayoutContext()
  const {isGaussianFit} = useGraphOptions()
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
  const isVerticalRef = useRef(!!(xAttrType && xAttrType === "numeric"))
  const valueRef = useRef<SVGGElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const kLabelLineHeight = 20
  const defaultLabelTopOffset = useCallback((adornment: IAdornmentModel) => {
    // We have to pass isGaussianFit to getLabelLinesAboveAdornment because the Gaussian fit is a special case where
    // if there is a gaussianFit (not just a normal curve), we need to add an extra line for the adornment title.
    return kLabelLineHeight * (adornmentsStore.getLabelLinesAboveAdornment(adornment, isGaussianFit) ?? 0)
  }, [adornmentsStore, isGaussianFit])

  return { graphModel, dataConfig, layout, adornmentsStore, xAttrType, xAttrId, yAttrId, xAttrName, yAttrName,
    numericAttrId, xScale, yScale, showLabel, isVerticalRef, valueRef, labelRef, defaultLabelTopOffset }
}
