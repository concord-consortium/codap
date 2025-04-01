import { select } from "d3"
import { observer } from "mobx-react-lite"
import { useEffect } from "react"
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
  const yScaleDomain = yAttrId ? yScale.domain() : [0, plotHeight]

  const pixelHeight = calculatePixelDimension(height, yAttrId?.toString(), yScale, plotHeight, true)
  const pixelWidth = calculatePixelDimension(width, xAttrId?.toString(), xScale, plotWidth)

  const xPosUnit = xPosition?.unit ?? "coordinate"
  const xPosValue = xPosition?.value ?? 0
  const xPixelPosition = xAttrId
    ? scaleValueToGraph(plotWidth, xScale, xPosUnit, xPosValue)
    : 0

  const yPosUnit = yPosition?.unit ?? "coordinate"
  const yPosValue = yPosition?.value ?? 0
  const yPixelPosition = yAttrId
    ? scaleValueToGraph(plotHeight, yScale, yPosUnit, yPosValue) - pixelHeight
    : yScale(yScaleDomain[1]) - pixelHeight

  const selection = spannerRef && select(spannerRef.current)

  // Refresh ROI position and dimensions when the model changes.
  useEffect(function updateRectangle() {
    if (!selection) return

    selection.select(".region-of-interest")
      .attr("x", xPixelPosition)
      .attr("y", yPixelPosition)
      .attr("width", pixelWidth)
      .attr("height", pixelHeight)

  }, [pixelHeight, xPixelPosition, yPixelPosition, pixelWidth, selection])

  // Refresh ROI position and dimensions when the plot size changes.
  // useEffect(function updateRectangle() {
  //   if (!selection) return

  //   const { newWidth, newHeight, newX, newY } = regionBounds()
  //   model.setSize(newWidth, newHeight)
  //   model.setPosition(newX, newY)

  //   selection.select(".region-of-interest")
  //     .attr("x", model.x)
  //     .attr("y", model.y)
  //     .attr("width", model.width)
  //     .attr("height", model.height)

  //   initialPlotWidthRef.current = plotWidth
  //   initialPlotHeightRef.current = plotHeight
  // }, [plotWidth, plotHeight, model, dataConfig, regionBounds, selection])

  // const regionBounds = useCallback(() => {
  //   const newWidth = { unit: width?.unit ?? "coordinate", value: pixelWidth }
  //   const newHeight = { unit: height?.unit ?? "coordinate", value: pixelHeight }
  //   const newX = { unit: xPosition?.unit ?? "coordinate", value: xPixelPosition }
  //   const newY = { unit: yPosition?.unit ?? "coordinate", value: yPixelPosition }
  //   return { newWidth, newHeight, newX, newY }
  // }, [height?.unit, pixelHeight, pixelWidth, width?.unit, xPixelPosition, xPosition?.unit, yPixelPosition,
  //     yPosition?.unit])

  // Refresh ROI position and dimensions when the axis changes.
  useEffect(function refreshAxisChange() {
    return mstAutorun(() => {
      getAxisDomains(xAxis, yAxis)
      // const { newWidth,  newHeight, newX, newY } = regionBounds()
      // model.setSize(newWidth, newHeight)
      // model.setPosition(newX, newY)
    }, { name: "RegionOfInterest.refreshAxisChange" }, model)
  }, [dataConfig, model, plotHeight, plotWidth, xAxis, yAxis])

  useEffect(function addRectangle() {
    if (!selection || selection.select(".region-of-interest").size() > 0) return

    selection.append("rect")
      .attr("class", "region-of-interest")
      .attr("data-testid", "region-of-interest")
      .attr("x", xPixelPosition)
      .attr("y", yPixelPosition)
      .attr("width", pixelWidth)
      .attr("height", pixelHeight)
  }, [selection, xPixelPosition, yPixelPosition, pixelWidth, pixelHeight])

  // The ROI is rendered in spannerRef, so we don't need to render anything here.
  return null
})
