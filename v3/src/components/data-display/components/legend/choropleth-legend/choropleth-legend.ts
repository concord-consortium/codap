import { axisBottom, format, max, min, NumberValue, range, scaleLinear, ScaleQuantile, select } from "d3"
import { kChoroplethHeight } from "../../../data-display-types"
import { neededSigDigitsArrayForQuantiles } from "../../../../../utilities/math-utils"
import { DatePrecision, determineLevels, formatDate, mapLevelToPrecision } from "../../../../../utilities/date-utils"
import { getStringBounds } from "../../../../axis/axis-utils"

export type ChoroplethLegendProps = {
  isDate?: boolean,
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
  if (scale.domain().length === 0) {
    select(choroplethElt).selectAll("*").remove()
    return
  }

  const {
      isDate, tickSize = 6, transform = '', width = 320,
      marginTop = 0, marginRight = 0, marginLeft = 0,
      ticks = 5, clickHandler, casesInQuantileSelectedHandler
    } = props,
    minValue = min(scale.domain()) ?? 0,
    maxValue = max(scale.domain()) ?? 0

  const tickFormatSpec = '.2r'

  select(choroplethElt).selectAll("*").remove()
  const svg = select(choroplethElt).append("svg")
    .attr('transform', transform)
    // .attr("viewBox", [0, 0, width, height])
    .style("overflow", "visible")
    .style("display", "block")

  const thresholds = scale.quantiles(),
    fullBoundaries = [minValue, ...thresholds, maxValue],
    domainValues = scale.domain(),
    significantDigits = neededSigDigitsArrayForQuantiles(fullBoundaries, domainValues),
    dateLevels = isDate ? determineLevels(minValue, maxValue) : {increment: 1, outerLevel: 0, innerLevel: 0},
    datePrecision = isDate ? mapLevelToPrecision(dateLevels.innerLevel + 1) : DatePrecision.None

  const thresholdFormat = isDate ? (date: number) => formatDate(date * 1000, datePrecision) ?? ''
    : format(tickFormatSpec)

  const legendScale = scaleLinear()
      .domain([-1, scale.range().length - 1])
      .rangeRound([marginLeft, width - marginRight]),
    tickValues = range(thresholds.length),
    tickFormat = (i: NumberValue) => thresholdFormat(thresholds[Number(i)]),
    minMaxFormat = isDate ? thresholdFormat
      : (d: number, i: number) => format(`.${significantDigits[i === 0 ? 0 : 5]}r`)(d),
    minStringWidth = getStringBounds(minMaxFormat(minValue, 0)).width,
    onlyShowMinMax = minStringWidth > 3 * width / 20 - 10

  svg.append("g")
    .selectAll("rect")
    .data(scale.range())
    .join("rect")
    .attr('class', 'choropleth-rect')
    .classed('legend-rect-selected',
      (color) => {
        return casesInQuantileSelectedHandler(scale.range().indexOf(color))
      })
    .attr('transform', transform)
    .attr("x", (d, i) => legendScale(i - 1))
    .attr("y", marginTop)
    .attr("width", (d, i) => legendScale(i) - legendScale(i - 1))
    .attr("height", kChoroplethHeight /*height - marginTop - marginBottom*/)
    .attr("fill", (d: string) => d)
    .on('click', (event, color) => {
      clickHandler(scale.range().indexOf(color), event.shiftKey)
    })
    .append('title')
    .text((color) => {
      const quantile = scale.range().indexOf(color)
      return `${thresholdFormat(fullBoundaries[quantile])} - ${thresholdFormat(fullBoundaries[quantile + 1])}`
    })


  const legendAxis = svg.append("g")
    .attr('class', 'legend-axis')
    .attr("transform", `${transform} translate(0,${kChoroplethHeight + marginTop})`)
  if (!onlyShowMinMax) {
    legendAxis.call(axisBottom(legendScale)
      .ticks(ticks)
      .tickFormat(tickFormat)
      .tickSize(tickSize)
      .tickValues(tickValues))
  }

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
          .text(minMaxFormat)
    )

  return svg.node()
}
