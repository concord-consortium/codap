/*

From Slack: https://concord-consortium.slack.com/archives/C035J6RDAK0/p1743171039736129

For scatterplot:

createRegionOfInterest( x-axis value, y-axis value, width-in-x-axis-value, height-in-y-axis value)
createRegionOfInterest( x-axis%, y-axis%, width-in-x-axis%, height-in-y-axis%)

or some mixed and matched version of the above.
One question would be about graphs with multiple attributes on the same y-axis or on two different y axes.
Perhaps the call needs to include the attributes to refer to.

For single univariate plot along the x-axis:

createRegionOfInterest(x-axis-value, width-in-x-axis-value)

or if vertical distribution:

createRegionOfInterest(y-axis-value, width-in-y-axis-value)

or any of the above in % of axis value. (edited)

For numerical x and categorical y it seems we will assume a rectangle that could extend across all
categories, but also might just be a rectangle within one of the categorical distribution plots. So in the
case of a categorical axis, if we specify a % of a category, then should it assume a % of the width or
height of the graph?

For DST we need a percent of the width or height of the graph not the individual category.

For categorical attributes % would refer to % of the width or height of the graph.

To create an Region of Interest you would minimally need one axis attribute, one x or y position (relative to which
axis was specified), a width, and a height.

I suppose in this case I could designate the x-axis attribute to be Habitat, and then specify the x position
and width values in % (which would be graph percent for a categorical attribute).

The question then come up what to do if I specify Lifespan as the x-attribute. Do we duplicate the
annotation in each vertical set of sub-plots? For example if I specified Lifespan as the x-attribute and
Diet as the y-attribute, then when I set the x-pos and width to a lifespan value, that happens in each of
the habitat categories.

I think that could work so it gives us the flexibility to use categorical attributes for both x and y if we
want to use positioning by graph % width and height, and if we specify a repeated numerical attribute, then
the annotation would be repeated.

*/

import { select } from "d3"
import { observer } from "mobx-react-lite"
import { useEffect } from "react"
import { ScaleNumericBaseType } from "../../../axis/axis-types"
import { useAdornmentAttributes } from "../../hooks/use-adornment-attributes"
import { useGraphDataConfigurationContext } from "../../hooks/use-graph-data-configuration-context"
import { IAdornmentComponentProps } from "../adornment-component-info"
import { IRegionOfInterestAdornmentModel, RoiPositionUnit } from "./region-of-interest-adornment-model"

import "./region-of-interest-adornment-component.scss"

export const determinePosition = (
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

export const RegionOfInterestAdornment = observer(function RegionOfInterestAdornment(props: IAdornmentComponentProps) {
  const { plotHeight, plotWidth, spannerRef } = props
  const model = props.model as IRegionOfInterestAdornmentModel
  const dataConfig = useGraphDataConfigurationContext()
  const { xAttrId: _aAttrId, yAttrId: _yAttrId, xScale, yScale } = useAdornmentAttributes()

  const {
    xAttribute, yAttribute, height: _height, width: _width,
    xPosition: _xPosition, yPosition: _yPosition
  } = model

  const roiXAttr = dataConfig?.dataset?.getAttributeByName(xAttribute) || xAttribute
  const roiYAttr = dataConfig?.dataset?.getAttributeByName(yAttribute) || yAttribute
  const xAttrId = roiXAttr || _aAttrId
  const yAttrId = roiYAttr || _yAttrId

  // TODO: If roiXAttr is defined and not equal to xAttrId, we need to use a scale other than xScale.
  // xScale in `useAdornmentAttributes` is defined as `layout.getAxisScale("bottom") as ScaleNumericBaseType`.
  // roiXAttr might be an attribute on the top split axis, in which case it will be a categorical attribute.
  // I'm not sure what that means exactly for the scale. It definitely won't be a numeric scale, at least.
  // const xPosition = xAttrId ? xScale(_xPosition.value) : 0
  const xPosition = xAttrId ? determinePosition(plotWidth, xScale, _xPosition.unit, _xPosition.value) : 0
  // TODO: If roiYAttr is defined and not equal to yAttrId, we need to use a scale other than yScale.
  // yScale in `useAdornmentAttributes` is defined as `layout.getAxisScale("left") as ScaleNumericBaseType`.
  // roiYAttr might be an attribute on the right split axis, in which case it will be a categorical attribute.
  // I'm not sure what that means exactly for the scale. It definitely won't be a numeric scale, at least.
  // const yPosition = yAttrId ? yScale(_yPosition.value) : 0
  const yPosition = yAttrId ? determinePosition(plotHeight, yScale, _yPosition.unit, _yPosition.value) : 0

  const xScaleDomain = xAttrId ? xScale.domain() : [0, plotWidth]
  const yScaleDomain = yAttrId ? yScale.domain() : [0, plotHeight]
  const height = _height
    ? yAttrId
      ? yScale(yScaleDomain[1] - _height)
      : _height
    : plotHeight
  const width = _width
    ? xAttrId
      ? xScale(xScaleDomain[0] + _width)
      : _width
    : plotWidth
  const selection = spannerRef && select(spannerRef.current)

  // Refresh ROI position and dimensions when the model changes.
  useEffect(function updateRectangle() {
    if (!selection) return

    selection.select(".region-of-interest")
      .attr("x", (xPosition - (width / 2)) < 0 ? 0 : (xPosition - (width / 2)))
      .attr("y", yPosition)
      .attr("width", width)
      .attr("height", height)

  }, [height, xPosition, yPosition, width, selection])

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

  // Refresh ROI position and dimensions when the axis changes.
  // useEffect(function refreshAxisChange() {
  //   return mstAutorun(() => {
  //     getAxisDomains(xAxis, yAxis)
  //     const { newWidth,  newHeight, newX, newY } = regionBounds()
  //     model.setSize(newWidth, newHeight)
  //     model.setPosition(newX, newY)
  //   }, { name: "RegionOfInterest.refreshAxisChange" }, model)
  // }, [dataConfig, model, plotHeight, plotWidth, regionBounds, xAxis, yAxis])

  useEffect(function addRectangle() {
    if (!selection || selection.select(".region-of-interest").size() > 0) return

    selection.append("rect")
      .attr("class", "region-of-interest")
      .attr("data-testid", "region-of-interest")
      .attr("x", xPosition)
      .attr("y", yPosition)
      .attr("width", width)
      .attr("height", height)
  }, [selection, xPosition, yPosition, width, height])

  // The ROI is rendered in spannerRef, so we don't need to render anything here.
  return null
})
