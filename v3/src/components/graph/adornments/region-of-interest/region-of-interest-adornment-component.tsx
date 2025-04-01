import { select } from "d3"
import { observer } from "mobx-react-lite"
import { useCallback, useEffect, useRef } from "react"
import { mstAutorun } from "../../../../utilities/mst-autorun"
import { ScaleNumericBaseType } from "../../../axis/axis-types"
import { useAdornmentAttributes } from "../../hooks/use-adornment-attributes"
import { useGraphDataConfigurationContext } from "../../hooks/use-graph-data-configuration-context"
import { IAdornmentComponentProps } from "../adornment-component-info"
import { getAxisDomains } from "../utilities/adornment-utils"
import { IRegionOfInterestAdornmentModel, RoiPositionUnit } from "./region-of-interest-adornment-model"

import "./region-of-interest-adornment-component.scss"

export const scaleValueToGraph = (
  plotSize: number, scale: ScaleNumericBaseType, unit: RoiPositionUnit, value: number
) => {
  if (value === null || value === undefined) return 0

  switch (unit) {
    case "%":
    case "percent":
      return (value / 100) * plotSize
    case "coordinate":
      return scale(value)
    default:
      return value
  }
}

export const calculatePixelDimension = (
  dimension: { unit: RoiPositionUnit; value: number } | undefined,
  attrId: string | undefined,
  scale: ScaleNumericBaseType,
  plotSize: number,
  isYAxis: boolean = false
) => {
  if (!dimension) return plotSize

  switch (dimension.unit) {
    case "coordinate":
      if (!attrId) return plotSize
      return isYAxis
        ? scale(0) - scale(dimension.value)
        : scale(dimension.value) - scale(0)
    case "percent":
    case "%":
      return (plotSize * dimension.value) / 100
    default:
      return plotSize
  }
}

const calculatePixelPosition = (
  attrId: string | undefined,
  plotSize: number,
  scale: ScaleNumericBaseType,
  position: { unit?: RoiPositionUnit; value?: number } | undefined,
  pixelDimension: number,
  isYAxis: boolean = false
) => {
  const posUnit = position?.unit ?? "coordinate"
  const posValue = position?.value ?? 0

  if (attrId) {
    return scaleValueToGraph(plotSize, scale, posUnit, posValue) - (isYAxis ? pixelDimension : 0)
  }

  if (posUnit === "percent" || posUnit === "%") {
    return isYAxis
      ? (plotSize * (100 - posValue) / 100) - pixelDimension
      : (plotSize * posValue / 100)
  }

  return isYAxis ? plotSize - pixelDimension : 0
}


export const RegionOfInterestAdornment = observer(function RegionOfInterestAdornment(props: IAdornmentComponentProps) {
  const { plotHeight, plotWidth, spannerRef, xAxis, yAxis } = props
  const model = props.model as IRegionOfInterestAdornmentModel
  const dataConfig = useGraphDataConfigurationContext()
  const { xAttrId: _aAttrId, yAttrId: _yAttrId, xScale, yScale } = useAdornmentAttributes()
  const { xAttribute, yAttribute, height, width, xPosition, yPosition } = model
  const roiXAttr = dataConfig?.dataset?.getAttributeByName(xAttribute) || xAttribute
  const roiYAttr = dataConfig?.dataset?.getAttributeByName(yAttribute) || yAttribute
  const xAttrId = roiXAttr || _aAttrId
  const yAttrId = roiYAttr || _yAttrId
  const roiRect = useRef<any>(null)

   useEffect(() => {
    if (!spannerRef?.current) return
    const selection = select(spannerRef.current)
    let rectSel = selection.select<SVGRectElement>(".region-of-interest")
    if (rectSel.empty()) {
      rectSel = selection.append("rect")
        .attr("class", "region-of-interest")
        .attr("data-testid", "region-of-interest")
    }
    roiRect.current = rectSel
  }, [spannerRef])

  const updateRectangle = useCallback(() => {
    if (!roiRect?.current) return

    const pixelHeight = calculatePixelDimension(height, yAttrId.toString(), yScale, plotHeight, true)
    const pixelWidth  = calculatePixelDimension(width,  xAttrId.toString(), xScale, plotWidth)

    const xPixelPosition = calculatePixelPosition(xAttrId.toString(), plotWidth, xScale, xPosition, pixelWidth)
    const yPixelPosition = calculatePixelPosition(yAttrId.toString(), plotHeight, yScale, yPosition, pixelHeight, true)

    roiRect.current.attr("x", xPixelPosition)
      .attr("y", yPixelPosition)
      .attr("width", pixelWidth)
      .attr("height", pixelHeight)
  }, [height, yScale, plotHeight, width, xScale, plotWidth, xPosition, yPosition, xAttrId, yAttrId])

  useEffect(() => {
    const disposer = mstAutorun(() => {
      getAxisDomains(xAxis, yAxis)
      updateRectangle()
    }, { name: "RegionOfInterestAdornment.refreshAxisChange" }, model)
    return disposer
  }, [model, xAxis, yAxis, plotWidth, plotHeight, updateRectangle])

  // The ROI is rendered in spannerRef, so we don't need to render anything here.
  return null
})
