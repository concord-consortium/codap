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

const isPercent = (value: string) => value.trim().endsWith("%")

export const calculatePixelDimension = (
  extent: number | string | undefined,
  attrId: string | undefined,
  scale: ScaleNumericBaseType | undefined,
  plotSize: number,
  isYAxis: boolean = false
) => {
  if (!extent) return plotSize

  const computeScaledExtent = (n: number) => {
    if (!attrId || !scale) return plotSize
    const scaled = scale(n)
    const zero = scale(0)
    return isYAxis ? zero - scaled : scaled - zero
  }

  if (typeof extent === "number") {
    return computeScaledExtent(extent)
  }

  const num = parseFloat(extent)
  if (isNaN(num)) return plotSize

  return isPercent(extent)
    ? (plotSize * num) / 100
    : computeScaledExtent(num)
}


const calculatePixelPosition = (
  attrId: string | undefined,
  plotSize: number,
  scale: ScaleNumericBaseType | undefined,
  position: number | string| undefined,
  pixelDimension: number,
  isYAxis: boolean = false,
  isYPrimary: boolean = false
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

    if (isPercent(position)) {
      posValue = processStringToNumber(position)
      posUnit = "percent"
    } else {
      posValue = processStringToNumber(position)
    }
  }

  if (attrId && scale) {
    const scaledPosition = scaleValueToGraph(plotSize, scale, posUnit, posValue)
    return isYAxis && typeof position === "string" && isPercent(position)
      ? plotSize - pixelDimension - scaledPosition
      : isYAxis
        ? scaledPosition - pixelDimension
        : scaledPosition
  }

  if (posUnit === "percent") {
    const retVal = isYAxis
      ? plotSize - ((plotSize * posValue - pixelDimension) / 100) - pixelDimension
      : plotSize * posValue / 100
    return retVal
  }

  // Default case: no position specified
  if (isYAxis) {
    // For y-axis, position at the bottom of the plot
    return plotSize - (isYPrimary ? 0 : pixelDimension)
  } else {
    // For x-axis, position at the left of the plot
    return 0
  }
}

export const RegionOfInterestAdornment = observer(function RegionOfInterestAdornment(props: IAdornmentComponentProps) {
  const { plotHeight, plotWidth, spannerRef, xAxis, yAxis } = props
  const model = props.model as IRegionOfInterestAdornmentModel
  const { dataConfig, xAttrId, yAttrId, xScale, yScale } = useAdornmentAttributes()
  const { primary, secondary } = model
  const roiRect = useRef<any>(null)
  const primaryAttrRole = dataConfig?.primaryRole ?? "x"
  const primaryScale = primaryAttrRole === "x" ? xScale : yScale
  const primaryAttrId = primaryAttrRole === "x" ? xAttrId : yAttrId
  const secondaryAttrId = primaryAttrRole === "y" ? undefined : yAttrId
  const secondaryScale = primaryAttrRole === "y" ? undefined : yScale

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

    // Determine which axis is primary and which is secondary
    const isYPrimary = primaryAttrRole === "y"
    
    // Set up plot dimensions based on primary axis
    const primaryPlotExtent = isYPrimary ? plotHeight : plotWidth
    const secondaryPlotExtent = isYPrimary ? plotWidth : plotHeight
    
    // Calculate dimensions based on primary axis
    const primaryDimension = calculatePixelDimension(
      primaryExtent, 
      primaryAttrId, 
      primaryScale, 
      primaryPlotExtent, 
      isYPrimary
    )
    
    const secondaryDimension = calculatePixelDimension(
      secondaryExtent, 
      secondaryAttrId, 
      secondaryScale, 
      secondaryPlotExtent, 
      !isYPrimary
    )
    
    // Calculate positions based on primary axis
    const primaryPosition = calculatePixelPosition(
      primaryAttrId, 
      primaryPlotExtent, 
      primaryScale, 
      primaryPos, 
      primaryDimension, 
      isYPrimary, 
      isYPrimary
    )
    
    const secondaryPosition = calculatePixelPosition(
      secondaryAttrId, 
      secondaryPlotExtent, 
      secondaryScale, 
      secondaryPos, 
      secondaryDimension, 
      !isYPrimary, 
      !isYPrimary
    )
    
    // Set rectangle attributes based on primary axis
    if (isYPrimary) {
      // When primary is Y-axis, swap width/height and x/y
      roiRect.current
        .attr("x", secondaryPosition)
        .attr("y", primaryPosition)
        .attr("width", secondaryDimension)
        .attr("height", primaryDimension)
    } else {
      // When primary is X-axis, normal assignment
      // For y-position, we need to position at the bottom of the plot
      const yPosition = plotHeight - secondaryDimension
      
      roiRect.current
        .attr("x", primaryPosition)
        .attr("y", yPosition)
        .attr("width", primaryDimension)
        .attr("height", secondaryDimension)
    }
  }, [primary, secondary, primaryAttrRole, primaryAttrId, primaryScale, plotWidth, secondaryAttrId, secondaryScale,
      plotHeight])

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
