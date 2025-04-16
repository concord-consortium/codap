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

const isPercent = (value: string|number) => {
  if (typeof value === "number") return false

  return value.trim().endsWith("%")
}

interface ICalculatePixelRange {
  extent: number | string;
  isYAxis?: boolean;
  plotSize: number;
  position: number | string;
  scale?: ScaleNumericBaseType;
}

const calculatePixelRange = (props: ICalculatePixelRange) => {
  const { extent, position, plotSize, scale, isYAxis = false } = props
  const extentValue = typeof extent === "number" ? extent : parseFloat(extent) || 0
  const positionValue = typeof position === "number" ? position : parseFloat(position) || 0

  const dimensionPx = isPercent(extent)
    ? (plotSize * extentValue) / 100
    : scale
      ? Math.abs(scale(extentValue) - scale(0))
      : plotSize

  let positionPx = 0
  if (isPercent(position)) {
    const pct = (plotSize * positionValue) / 100
    positionPx = isYAxis ? plotSize - dimensionPx - pct : pct
  } else if (scale) {
    const scaled = scale(positionValue)
    positionPx = isYAxis ? scaled - dimensionPx : scaled
  } else {
    positionPx = isYAxis ? plotSize - dimensionPx : 0
  }

  return {
    dimension: dimensionPx,
    position: positionPx
  }
}

export const RegionOfInterestAdornment = observer(function RegionOfInterestAdornment(props: IAdornmentComponentProps) {
  const { plotHeight, plotWidth, spannerRef, xAxis, yAxis } = props
  const model = props.model as IRegionOfInterestAdornmentModel
  const { dataConfig, graphModel, xScale, yScale } = useAdornmentAttributes()
  const { primary, secondary } = model
  const roiRect = useRef<any>(null)
  const isYPrimary = dataConfig?.primaryRole && graphModel?.plotType !== "scatterPlot"
    ? dataConfig.primaryRole === "y"
    : false

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
    const primaryScale = isYPrimary? yScale : xScale
    const secondaryScale = isYPrimary ? undefined : yScale
    const primaryPlotExtent = isYPrimary ? plotHeight : plotWidth
    const secondaryPlotExtent = isYPrimary ? plotWidth : plotHeight

    const primaryProps = {
      extent: primaryExtent || 0,
      position: primaryPos || 0,
      plotSize: primaryPlotExtent,
      scale: primaryScale,
      isYAxis: isYPrimary
    }
    const {dimension: primaryDimension, position: primaryPosition} = calculatePixelRange(primaryProps)

    const secondaryProps = {
      extent: secondaryExtent || 0,
      position: secondaryPos || 0,
      plotSize: secondaryPlotExtent,
      scale: secondaryScale,
      isYAxis: !isYPrimary
    }
    const {dimension: secondaryDimension, position: secondaryPosition} = calculatePixelRange(secondaryProps)

    // Set rectangle attributes based on primary axis
    if (isYPrimary) {
      roiRect.current
        .attr("x", secondaryPosition)
        .attr("y", primaryPosition)
        .attr("width", secondaryDimension)
        .attr("height", primaryDimension)
    } else {
      roiRect.current
        .attr("x", primaryPosition)
        .attr("y", secondaryPosition)
        .attr("width", primaryDimension)
        .attr("height", secondaryDimension)
    }

  }, [primary, secondary, isYPrimary, plotWidth, plotHeight, xScale, yScale])

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
