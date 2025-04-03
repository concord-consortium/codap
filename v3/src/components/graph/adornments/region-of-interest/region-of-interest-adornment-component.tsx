import { select } from "d3"
import { observer } from "mobx-react-lite"
import { useCallback, useEffect, useRef } from "react"
import { mstAutorun } from "../../../../utilities/mst-autorun"
import { ScaleNumericBaseType } from "../../../axis/axis-types"
import { useAdornmentAttributes } from "../../hooks/use-adornment-attributes"
import { IAdornmentComponentProps } from "../adornment-component-info"
import { getAxisDomains } from "../utilities/adornment-utils"
import { IRegionOfInterestAdornmentModel } from "./region-of-interest-adornment-model"

import "./region-of-interest-adornment-component.scss"

export const scaleValueToGraph = (
  plotSize: number, scale: ScaleNumericBaseType, unit: "coordinate" | "percent", value: number
) => {
  if (value === null || value === undefined) return 0

  switch (unit) {
    case "percent":
      return (value / 100) * plotSize
    case "coordinate":
      return scale(value)
    default:
      return value
  }
}

export const calculatePixelDimension = (
  extent: number | string | undefined,
  attrId: string | undefined,
  scale: ScaleNumericBaseType,
  plotSize: number,
  isYAxis: boolean = false
) => {
  if (!extent) return plotSize

  const parseExtent = (value: string) => {
    if (value.endsWith("%")) {
      const percentValue = parseFloat(value.replace("%", "").trim())
      return isNaN(percentValue) ? plotSize : (plotSize * percentValue) / 100
    }
    const parsedValue = parseFloat(value)
    return isNaN(parsedValue) || !attrId
      ? plotSize
      : isYAxis
      ? scale(0) - scale(parsedValue)
      : scale(parsedValue) - scale(0)
  }

  return typeof extent === "number"
    ? attrId
      ? isYAxis
        ? scale(0) - scale(extent)
        : scale(extent) - scale(0)
      : plotSize
    : parseExtent(extent.toString())
}

const calculatePixelPosition = (
  attrId: string | undefined,
  plotSize: number,
  scale: ScaleNumericBaseType,
  position: number|string|undefined,
  pixelDimension: number,
  isYAxis: boolean = false
) => {

  let posValue = 0
  let posUnit: "coordinate" | "percent" = "coordinate"

  if (typeof position === "number") {
    posValue = position
  } else if (typeof position === "string") {
    const processStringToNumber = (str: string) => {
      const parsed = parseFloat(str)
      return isNaN(parsed) ? 0 : parsed
    }
    if (position.endsWith("%")) {
      posValue = processStringToNumber(position.replace("%", "").trim())
      posUnit = "percent"
    } else {
      posValue = processStringToNumber(position.trim())
    }
  }


  if (attrId) {
    return scaleValueToGraph(plotSize, scale, posUnit, posValue) - (isYAxis ? pixelDimension : 0)
  }

  if (typeof position === "string" && position.endsWith("%")) {
    const percentValue = parseFloat(position.replace("%", "").trim())
    if (isNaN(percentValue)) {
      return isYAxis
        ? plotSize - pixelDimension
        : 0
    }
    return isYAxis
      ? (plotSize * (100 - posValue) / 100) - pixelDimension
      : (plotSize * posValue / 100)
  }

  return isYAxis ? plotSize - pixelDimension : 0
}


export const RegionOfInterestAdornment = observer(function RegionOfInterestAdornment(props: IAdornmentComponentProps) {
  const { plotHeight, plotWidth, spannerRef, xAxis, yAxis } = props
  const model = props.model as IRegionOfInterestAdornmentModel
  const { xAttrId, yAttrId, xScale, yScale } = useAdornmentAttributes()
  const { primary, secondary } = model
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
    const { position: primaryPos, extent: primaryExtent } = primary
    const { position: secondaryPos, extent: secondaryExtent } = secondary

    const pixelWidth  = calculatePixelDimension(primaryExtent,  xAttrId, xScale, plotWidth)
    const pixelHeight = calculatePixelDimension(secondaryExtent, yAttrId, yScale, plotHeight, true)

    const xPixelPosition = calculatePixelPosition(xAttrId, plotWidth, xScale, primaryPos, pixelWidth)
    const yPixelPosition = calculatePixelPosition(yAttrId, plotHeight, yScale, secondaryPos, pixelHeight, true)

    roiRect.current.attr("x", xPixelPosition)
      .attr("y", yPixelPosition)
      .attr("width", pixelWidth)
      .attr("height", pixelHeight)
  }, [yScale, plotHeight, xScale, plotWidth, xAttrId, yAttrId, primary, secondary])

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
