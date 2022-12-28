// Copyright 2021, Observable Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/scale-legend
import {
  axisBottom,
  interpolate,
  interpolateRound,
  quantize,
  scaleBand,
  ScaleContinuousNumeric,
  scaleLinear,
  format,
  range,
  select
} from "d3"
import {kChoroplethHeight} from "../../../graphing-types"

export function choroplethLegend(scale:any, choroplethElt:SVGGElement, {
  title='',
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
  tickSize = 6,
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
  width = 320,
  height = 44 + tickSize,
  rectHeight = 16,
  transform = '',
  marginTop = 0,
  marginRight = 0,
  marginBottom = 16 + tickSize,
  marginLeft = 0,
  ticks = width / 64,
  tickFormat='',
  tickValues:any = []
} = {}) {

  function ramp(iScale:ScaleContinuousNumeric<number, string>, n = 256) {
    const canvas = document.createElement("canvas")
    canvas.width = n
    canvas.height = 1
    const context = canvas.getContext("2d") as CanvasRenderingContext2D
    for (let i = 0; i < n; ++i) {
      context.fillStyle = iScale(i / (n - 1))
      context.fillRect(i, 0, 1, 1)
    }
    return canvas
  }

  const svg = select(choroplethElt).append("svg")
    .attr('transform', transform)
    .attr("width", width)
    .attr("height", height)
    // .attr("viewBox", [0, 0, width, height])
    .style("overflow", "visible")
    .style("display", "block")

  // let tickAdjust = (g:any) => g.selectAll(".tick line").attr("y1", marginTop + marginBottom - height)
  let x:any

  // Continuous
  if (scale.interpolate) {
    const n = Math.min(scale.domain().length, scale.range().length)

    x = scale.copy().rangeRound(quantize(interpolate(marginLeft, width - marginRight), n))

    svg.append("image")
      .attr("x", marginLeft)
      .attr("y", marginTop)
      .attr("width", width - marginLeft - marginRight)
      .attr("height", height - marginTop - marginBottom)
      .attr("preserveAspectRatio", "none")
      .attr("xlink:href", ramp(scale.copy().domain(quantize(interpolate(0, 1), n))).toDataURL())
  }

  // Sequential
  else if (scale.interpolator) {
    x = Object.assign(scale.copy()
        .interpolator(interpolateRound(marginLeft, width - marginRight)),
      {range() { return [marginLeft, width - marginRight] }})

    svg.append("image")
      .attr("x", marginLeft)
      .attr("y", marginTop)
      .attr("width", width - marginLeft - marginRight)
      .attr("height", height - marginTop - marginBottom)
      .attr("preserveAspectRatio", "none")
      .attr("xlink:href", ramp(scale.interpolator()).toDataURL())

    // scaleSequentialQuantile doesn’t implement ticks or tickFormat.
    if (!x.ticks) {
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
      if (tickValues === undefined) {
        const n = Math.round(ticks + 1)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
        tickValues = range(n).map(i => quantile(scale.domain(), i / (n - 1)))
      }
      if (typeof tickFormat !== "function") {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
        tickFormat = format(tickFormat === undefined ? ",f" : tickFormat)
      }
    }
  }

  // Threshold
  else if (scale.invertExtent) {
    const thresholds
      = scale.thresholds ? scale.thresholds() // scaleQuantize
      : scale.quantiles ? scale.quantiles() // scaleQuantile
        : scale.domain() // scaleThreshold

    const thresholdFormat
      = tickFormat === undefined ? (d:any) => d
      : typeof tickFormat === "string" ? format(tickFormat)
        : tickFormat

    x = scaleLinear()
      .domain([-1, scale.range().length - 1])
      .rangeRound([marginLeft, width - marginRight])

    svg.append("g")
      .selectAll("rect")
      .data(scale.range())
      .join("rect")
      .attr('transform', transform)
      .attr("x", (d, i) => x(i - 1))
      .attr("y", marginTop)
      .attr("width", (d, i) => x(i) - x(i - 1))
      .attr("height", kChoroplethHeight /*height - marginTop - marginBottom*/)
      .attr("fill", (d:string) => d)

    // const tickValues = range(thresholds.length)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
    tickFormat = i => thresholdFormat(thresholds[i], i)
  }

  // Ordinal
  else {
    x = scaleBand()
      .domain(scale.domain())
      .rangeRound([marginLeft, width - marginRight])

    svg.append("g")
      .selectAll("rect")
      .data(scale.domain())
      .join("rect")
      .attr("x", x)
      .attr("y", marginTop)
      .attr("width", Math.max(0, x.bandwidth() - 1))
      .attr("height", height - marginTop - marginBottom)
      .attr("fill", scale)

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    // tickAdjust = () => {}
  }

  svg.append("g")
    .attr("transform", transform + `translate(0,${kChoroplethHeight})`)
    .call(axisBottom(x)
      .ticks(ticks, typeof tickFormat === "string" ? tickFormat : undefined))
      // .tickFormat(typeof tickFormat === "function" ? tickFormat : undefined)
      // .tickSize(tickSize)
      // .tickValues(tickValues))
    // .call(tickAdjust)
    // .call(g => g.select(".domain").remove())
    // .call(g => g.append("text")
    //   .attr("x", marginLeft)
    //   .attr("y", marginTop + marginBottom - height - 6)
    //   .attr("fill", "currentColor")
    //   .attr("text-anchor", "start")
    //   .attr("font-weight", "bold")
    //   .attr("class", "title")
    //   .text(title))

  return svg.node()
}
