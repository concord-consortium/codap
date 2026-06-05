import {axisBottom, format, max, min, NumberValue, range, scaleLinear, ScaleQuantile, ScaleQuantize,
        ScaleThreshold, select} from "d3"
import { measureTextExtent } from "../../../../../hooks/use-measure-text"
import {
  determineLevels, formatDate, kDatePrecisionNone, mapLevelToPrecision
} from "../../../../../utilities/date-utils"
import { binBoundaryDecimalPlaces } from "../../../../../utilities/math-utils"
import { kChoroplethHeight, kDataDisplayFont } from "../../../data-display-types"

// Gap (px) below the color bar before the label text. Used both as the axis tickPadding for the
// interior tick labels and as the `y` of the min/max endpoint labels; the endpoint labels also copy
// d3's `dy` of "0.71em", so endpoint and interior labels share an identical baseline.
const kLegendLabelPadding = 6
const kLegendLabelBaselineDy = "0.71em"
// Minimum horizontal gap (px) required between adjacent legend labels before interior labels show.
const kLegendLabelGap = 4

export type ChoroplethLegendProps = {
  isDate?: boolean,
  // When true, format numeric labels with thousands separators (e.g. "10,000"). The caller disables
  // this for year-like attributes (which are typed numeric, not date) so years render as "2024", not
  // "2,024" — matching how CODAP formats numbers elsewhere (see getNumFormatterForAttribute).
  useGrouping?: boolean,
  width?: number,
  rectHeight?: number,
  transform?: string,
  marginTop?: number,
  marginRight?: number,
  marginLeft?: number,
  ticks?: number,
  // Effective legend extent to display as the min/max endpoint labels. A quantile scale's domain is
  // its training samples, whose extent need not match a user-set Min/Max range; when provided these
  // override the domain-derived endpoints so the legend matches the range the user set (CODAP-1292).
  legendMin?: number,
  legendMax?: number,
  clickHandler: (bin: number, extend: boolean) => void,
  casesInBinSelectedHandler: (bin: number) => boolean
}

type ChoroplethScale = ScaleQuantile<string> | ScaleQuantize<string> | ScaleThreshold<number, string>

function isScaleQuantile(scale: ChoroplethScale): scale is ScaleQuantile<string> {
  return "quantiles" in scale
}

function isScaleQuantize(scale: ChoroplethScale): scale is ScaleQuantize<string> {
  return "nice" in scale
}

export function getScaleThresholds(scale: ChoroplethScale) {
  return isScaleQuantile(scale) ? scale.quantiles()
    : isScaleQuantize(scale) ? scale.thresholds()
      : scale.domain()
}

export function choroplethLegend(scale: ChoroplethScale, choroplethElt: SVGGElement, props: ChoroplethLegendProps) {
  // Handle invalid or not enough cases:
  // - Quantile legends: the domain length will be 0
  // - Quantize legends: the domain will be [NaN, NaN]
  const domain = scale.domain()
  if (domain.length === 0 || isNaN(domain[0])) {
    select(choroplethElt).selectAll("*").remove()
    return
  }

  const {
      isDate, useGrouping = false, transform = '', width = 320,
      marginTop = 0, marginRight = 0, marginLeft = 0,
      ticks = 5, legendMin, legendMax, clickHandler, casesInBinSelectedHandler
    } = props,
    // Prefer the caller-provided effective range; fall back to the scale domain's extent (a quantile
    // scale's domain is its training samples, so its extent can differ from the user-set range).
    minValue = legendMin ?? min(scale.domain()) ?? 0,
    maxValue = legendMax ?? max(scale.domain()) ?? 0

  select(choroplethElt).selectAll("*").remove()
  const svg = select(choroplethElt).append("svg")
    .attr('transform', transform)
    // .attr("viewBox", [0, 0, width, height])
    .style("overflow", "visible")
    .style("display", "block")

  const thresholds = getScaleThresholds(scale),
    fullBoundaries = [minValue, ...thresholds, maxValue],
    dateLevels = isDate ? determineLevels(minValue, maxValue) : {increment: 1, outerLevel: 0, innerLevel: 0},
    datePrecision = isDate ? mapLevelToPrecision(dateLevels.innerLevel + 1) : kDatePrecisionNone,
    // Format every boundary (tick labels, tooltips, and the min/max endpoint labels) with a single,
    // shared number of decimal places. This keeps labels visually consistent (e.g. "0.0, 0.5, 1.0"
    // rather than "0, 0.5, 1.00") and stops a narrow range like 100–110 from collapsing to
    // "100, 100, 110" the way a fixed 2-significant-figure format did.
    decimalPlaces = binBoundaryDecimalPlaces(fullBoundaries),
    formatBoundary = isDate
      ? (value: number) => formatDate(value * 1000, datePrecision) ?? ''
      : format(`${useGrouping ? ',' : ''}.${decimalPlaces}f`)

  const legendScale = scaleLinear()
      .domain([-1, scale.range().length - 1])
      .rangeRound([marginLeft, width - marginRight]),
    tickValues = range(thresholds.length),
    tickFormat = (i: NumberValue) => formatBoundary(thresholds[Number(i)])

  // Show the interior threshold labels only if they fit without colliding with each other or with
  // the left/right-justified min/max endpoint labels; otherwise show just the endpoints. (The
  // endpoints are always shown, justified to the bar edges; interior labels are centered on their
  // boundaries.)
  const labelWidth = (value: number) => measureTextExtent(formatBoundary(value), kDataDisplayFont).width,
    interiorCenters = tickValues.map(i => legendScale(i)),
    interiorWidths = thresholds.map(labelWidth),
    lastIndex = interiorCenters.length - 1,
    fitBesideEndpoints = interiorCenters.length === 0 || (
      interiorCenters[0] - interiorWidths[0] / 2 >= marginLeft + labelWidth(minValue) + kLegendLabelGap &&
      interiorCenters[lastIndex] + interiorWidths[lastIndex] / 2 <=
        (width - marginRight) - labelWidth(maxValue) - kLegendLabelGap),
    interiorLabelsFit = interiorCenters.every((center, i) =>
      i === 0 || center - interiorWidths[i] / 2 >=
        interiorCenters[i - 1] + interiorWidths[i - 1] / 2 + kLegendLabelGap),
    onlyShowMinMax = !(fitBesideEndpoints && interiorLabelsFit)

  svg.append("g")
    .selectAll("rect")
    .data(scale.range())
    .join("rect")
    .attr('class', 'choropleth-rect')
    .classed('legend-rect-selected',
      (color) => {
        return casesInBinSelectedHandler(scale.range().indexOf(color))
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
      const bin = scale.range().indexOf(color)
      const lastBin = scale.range().length - 1
      // Bins are half-open [binMin, binMax) and the scale clamps out-of-range values into the end
      // bins, so the first bin covers everything below its upper threshold and the last everything
      // at-or-above its lower threshold. Show those open-ended (rather than the [min, max] domain),
      // which is only correct once the user can narrow the range (CODAP-1292).
      if (lastBin > 0 && bin === 0) return `< ${formatBoundary(fullBoundaries[1])}`
      if (lastBin > 0 && bin === lastBin) return `≥ ${formatBoundary(fullBoundaries[bin])}`
      return `${formatBoundary(fullBoundaries[bin])} - ${formatBoundary(fullBoundaries[bin + 1])}`
    })


  const legendAxis = svg.append("g")
    .attr('class', 'legend-axis')
    .attr("transform", `${transform} translate(0,${kChoroplethHeight + marginTop})`)
  if (!onlyShowMinMax) {
    legendAxis.call(axisBottom(legendScale)
      .ticks(ticks)
      .tickFormat(tickFormat)
      // tickSize 0 removes the tick-line allowance from the label offset; tickPadding then sets the
      // gap below the bar (we strip the now-zero-length lines and domain below anyway).
      .tickSize(0)
      .tickPadding(kLegendLabelPadding)
      .tickValues(tickValues))
    // Show only the interior threshold labels: strip the tick lines and the domain path so no tick
    // marks render, matching the markless narrow (endpoints-only) case.
    legendAxis.selectAll('.tick line').remove()
    legendAxis.select('.domain').remove()
  }

  svg.select('.legend-axis')
    .append('g')
    .attr('class', 'legend-axis-label')
    .selectAll('text')
    .data([Number(minValue), Number(maxValue)])
    .join(
      (enter) =>
        enter.append('text')
          // The min/max labels live inside the .legend-axis group. When interior ticks render, d3's
          // axisBottom sets fill:none on that group (overriding it only on its own tick texts), so
          // without an explicit fill these endpoint labels would inherit fill:none and disappear.
          .attr('fill', 'currentColor')
          .attr('y', kLegendLabelPadding)
          .attr('dy', kLegendLabelBaselineDy)
          // Justify min to the bar's left edge and max to its right edge so both stay within the
          // legend bounds (rather than the SVG edges, which sit marginLeft/marginRight outside the bar).
          .style('text-anchor', (d, i) => i ? 'end' : 'start')
          .attr('x', (d, i) => i ? width - marginRight : marginLeft)
          .text(formatBoundary)
    )

  return svg.node()
}
