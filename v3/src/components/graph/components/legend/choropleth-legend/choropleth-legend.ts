// Copyright 2021, Observable Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/scale-legend
import {
  axisBottom,
  /*
  interpolate,
  interpolateRound,
  quantize,
  scaleBand,
  ScaleContinuousNumeric,
*/
  scaleLinear,
  format,
  // range,
  select, range, min, max, ScaleQuantile, NumberValue
} from "d3"
import {kChoroplethHeight} from "../../../graphing-types"
import {neededSigDigitsArrayForQuantiles} from "../../../../../utilities/math-utils"

export type ChoroplethLegendProps = {
  tickSize?: number,
  width?: number,
  rectHeight?: number,
  transform?: string,
  marginTop?: number,
  marginRight?: number,
  marginLeft?: number,
  ticks?: number,
  clickHandler: (quantile: number, extend: boolean) => void,
  casesInQuantileSelectedHandler: (quantile: number) => boolean
}

type ChoroplethScale = ScaleQuantile<string>
export function choroplethLegend(scale: ChoroplethScale, choroplethElt: SVGGElement, props: ChoroplethLegendProps) {
  const {
      tickSize = 6, transform = '', width = 320, marginTop = 0, marginRight = 0, marginLeft = 0,
      ticks = 5, clickHandler, casesInQuantileSelectedHandler
    } = props,
    minValue = min(scale.domain()) ?? 0,
    maxValue = max(scale.domain()) ?? 0

  let tickFormat: string | ((i: NumberValue) => string) = '.2r',
    tickValues: number[] = []

  select(choroplethElt).selectAll("*").remove()
  const svg = select(choroplethElt).append("svg")
    .attr('transform', transform)
    // .attr("viewBox", [0, 0, width, height])
    .style("overflow", "visible")
    .style("display", "block")

  const thresholds =
      scale.quantiles(),
    fullBoundaries = [minValue, ...thresholds, maxValue],
    domainValues = scale.domain(),
    significantDigits = neededSigDigitsArrayForQuantiles(fullBoundaries, domainValues)

  const thresholdFormat = typeof tickFormat === "string" ? format(tickFormat)
    : tickFormat

  const x = scaleLinear()
    .domain([-1, scale.range().length - 1])
    .rangeRound([marginLeft, width - marginRight])

  svg.append("g")
    .selectAll("rect")
    .data(scale.range())
    .join("rect")
    .classed('legend-rect-selected',
      (color) => {
        return casesInQuantileSelectedHandler(scale.range().indexOf(color))
      })
    .attr('transform', transform)
    .attr("x", (d, i) => x(i - 1))
    .attr("y", marginTop)
    .attr("width", (d, i) => x(i) - x(i - 1))
    .attr("height", kChoroplethHeight /*height - marginTop - marginBottom*/)
    .attr("fill", (d: string) => d)
    .on('click', (event, color) => {
      clickHandler(scale.range().indexOf(color), event.shiftKey)
    })

  tickValues = range(thresholds.length)
  tickFormat = (i: NumberValue) => thresholdFormat(thresholds[Number(i)])

  svg.append("g")
    .attr('class', 'legend-axis')
    .attr("transform", `${transform} translate(0,${kChoroplethHeight})`)
    .call(axisBottom(x)
      .ticks(ticks)
      .tickFormat(tickFormat)
      .tickSize(tickSize)
      .tickValues(tickValues))

  svg.select('.legend-axis')
    .append('g')
    .attr('class', 'legend-axis-label')
    .selectAll('text')
    .data([Number(minValue), Number(maxValue)])
    .join(
      (enter) =>
        enter.append('text')
          .attr('y', kChoroplethHeight)
          .style('text-anchor', (d, i) => i ? 'end' : 'start')
          .attr('x', (d, i) => i * width)
          .text((d, i) => format(`.${significantDigits[i === 0 ? 0 : 5]}r`)(d))
    )

  return svg.node()
}
