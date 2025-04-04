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
  if (typeof value === "number") {
    return false
  }
  return value.trim().endsWith("%")
}

export const calculatePixelAttributes = (
  extent: number | string,
  position: number | string,
  scale: ScaleNumericBaseType | undefined,
  plotSize: number,
  isYAxis: boolean = false
) => {
  const extentValue = (typeof extent === 'number') ? extent : parseFloat(extent) || 0
  const positionValue = (typeof position === 'number') ? position : parseFloat(position) || 0

  let dimensionPxValue = plotSize
  let positionPxValue = isYAxis ? plotSize : 0
  const positionOffset = isYAxis ? dimensionPxValue : 0

  if (isPercent(extent)) {
    dimensionPxValue = (plotSize * extentValue) / 100
  } else if (scale) {
    const scaled = scale(extentValue)
    const zero = scale(0)
    dimensionPxValue = isYAxis ? zero - scaled : scaled - zero
  }

  if (isPercent(position)) {
    const pctPlot = (plotSize * positionValue) / 100
    positionPxValue = isYAxis ? (plotSize - pctPlot) : pctPlot
  } else if (scale) {
    positionPxValue = scale(positionValue)
  }

  return {
    dimension: dimensionPxValue,
    position: positionPxValue - positionOffset
  }
}

export const RegionOfInterestAdornment = observer(function RegionOfInterestAdornment(props: IAdornmentComponentProps) {
  const { plotHeight, plotWidth, spannerRef, xAxis, yAxis } = props
  const model = props.model as IRegionOfInterestAdornmentModel
  const { dataConfig, xAttrId, yAttrId, xScale, yScale } = useAdornmentAttributes()
  const { primary, secondary } = model
  const roiRect = useRef<any>(null)
  const primaryAttrRole = dataConfig?.primaryRole ?? "x"

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

    const isYPrimary = primaryAttrRole === "y"

    const primaryScale = isYPrimary? yScale : xScale
    const secondaryScale = isYPrimary ? undefined : yScale

    const primaryPlotExtent = isYPrimary ? plotHeight : plotWidth
    const secondaryPlotExtent = isYPrimary ? plotWidth : plotHeight

    // Calculate dimensions based on primary axis
    const {dimension: primaryDimension, position: primaryPosition} = calculatePixelAttributes(
      primaryExtent || 0,
      primaryPos || 0,
      primaryScale,
      primaryPlotExtent,
      isYPrimary
    )

    const {dimension: secondaryDimension, position: secondaryPosition} = calculatePixelAttributes(
      secondaryExtent || 0,
      secondaryPos || 0,
      secondaryScale,
      secondaryPlotExtent,
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
      roiRect.current
        .attr("x", primaryPosition)
        .attr("y", secondaryPosition)
        .attr("width", primaryDimension)
        .attr("height", secondaryDimension)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primary, secondary, primaryAttrRole, plotWidth, plotHeight, xScale, yScale, xAttrId, yAttrId])

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
