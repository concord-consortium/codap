import { format, ScaleLinear, select } from "d3"
import { between } from "../../../utilities/math-utils"
import { transitionDuration } from "../../data-display/data-display-types"
import { computeBestNumberOfTicks } from "../axis-utils"
import { AxisScaleType, otherPlace } from "../axis-types"
import { isNonDateNumericAxisModel } from "../models/numeric-axis-models"
import { AxisHelper, IAxisHelperArgs } from "./axis-helper"

export interface INumericAxisHelperArgs extends IAxisHelperArgs {
  showScatterPlotGridLines: boolean
  showZeroAxisLine?: boolean
}
export class NumericAxisHelper extends AxisHelper {
  showScatterPlotGridLines: boolean
  showZeroAxisLine?: boolean

  constructor(props: INumericAxisHelperArgs) {
    super(props)
    this.showScatterPlotGridLines = props.showScatterPlotGridLines
    this.showZeroAxisLine = props.showZeroAxisLine
  }

  get newRange() {
    return this.isVertical ? [this.rangeMax, this.rangeMin] : [this.rangeMin, this.rangeMax]
  }

  renderScatterPlotGridLines() {
    const d3Scale: AxisScaleType = this.multiScale?.scale.copy().range(this.newRange) as AxisScaleType,
      numericScale = d3Scale as unknown as ScaleLinear<number, number>
    select(this.subAxisElt).selectAll('.zero, .grid').remove()
    const tickLength = this.layout.getAxisLength(otherPlace(this.axisPlace)) ?? 0
    select(this.subAxisElt).append('g')
      .attr('class', 'grid')
      .call(this.axis(numericScale).tickSizeInner(-tickLength))
    select(this.subAxisElt).select('.grid').selectAll('text').remove()
    if (between(0, numericScale.domain()[0], numericScale.domain()[1])) {
      select(this.subAxisElt).append('g')
        .attr('class', 'zero')
        .call(this.axis(numericScale).tickSizeInner(-tickLength).tickValues([0]))
      select(this.subAxisElt).select('.zero').selectAll('text').remove()
    }
  }

  renderZeroAxisLine() {
    const d3Scale: AxisScaleType = this.multiScale?.scale.copy().range(this.newRange) as AxisScaleType,
      numericScale = d3Scale as unknown as ScaleLinear<number, number>
    select(this.subAxisElt).selectAll('.zero, .grid').remove()
    const tickLength = this.layout.getAxisLength(otherPlace(this.axisPlace)) ?? 0
    if (between(0, numericScale.domain()[0], numericScale.domain()[1])) {
      select(this.subAxisElt).append('g')
        .attr('class', 'zero')
        .call(this.axis(numericScale).tickSizeInner(-tickLength).tickValues([0]))
      select(this.subAxisElt).select('.zero').selectAll('text').remove()
    }
  }

  render() {
    const numericScale = this.multiScale?.scaleType === "linear"
      ? this.multiScale.numericScale?.copy().range(this.newRange) as ScaleLinear<number, number>
      : undefined
    if (!isNonDateNumericAxisModel(this.axisModel) || !numericScale || !this.subAxisElt) return

    const subAxisSelection = select(this.subAxisElt)
    // Simplest if we remove everything and start again. Without this, #188523090 caused trouble
    subAxisSelection.selectAll('*').remove()
    this.renderAxisLine()

    const hasDraggableNumericAxis = this.axisProvider.hasDraggableNumericAxis(this.axisModel)

    const axisScale = this.axis(numericScale).tickSizeOuter(0).tickFormat(format('.9'))
    const duration = this.isAnimating() ? transitionDuration : 0
    if (!this.isVertical && hasDraggableNumericAxis) {
      axisScale.tickValues(numericScale.ticks(computeBestNumberOfTicks(numericScale)))
    } else if (!hasDraggableNumericAxis) {
      const formatter = (value: number) => this.multiScale?.formatValueForScale(value) ?? ""
      const {tickValues, tickLabels} = this.axisProvider.nonDraggableAxisTicks(formatter) ||
      {tickValues: [], tickLabels: []}
      axisScale.tickValues(tickValues)
      axisScale.tickFormat((d, i) => tickLabels[i])
    }
    if (this.axisModel.integersOnly) {
      // Note: This has the desirable effect of removing the decimal point from the tick labels,
      // but it doesn't prevent the tick marks from showing for fractional values or grid lines
      // from being drawn at fractional values.
      axisScale.tickFormat((d, i) => {
        return Number.isInteger(d) ? d.toString() : ""
      })
    }
    subAxisSelection
      .attr("class", "numeric-axis")
      .attr("transform", this.initialTransform)
      .transition().duration(duration)
      .call(axisScale).selectAll("line,path")
      .style("stroke", "lightgrey")
      .style("stroke-opacity", "0.7")

    this.showZeroAxisLine && this.renderZeroAxisLine()
    this.showScatterPlotGridLines && this.renderScatterPlotGridLines()

    if (this.axisModel.place === 'bottom') {
      // Detect overlapping tick labels
      const tickLabelsSelection = subAxisSelection.selectAll(".tick text")
      requestAnimationFrame(() => {
        let hasOverlap = false
        let previousEnd = 0
        let detectedNonZeroTextLength = false

        tickLabelsSelection.each(function (_, i) {
          const currentNode = this as SVGTextElement
          const textWidth = currentNode.getComputedTextLength()
          const currentStart = currentNode.getBoundingClientRect().left
          const currentEnd = currentStart + textWidth
          detectedNonZeroTextLength ||= textWidth > 0

          if (i > 0 && currentStart < previousEnd) {
            hasOverlap = true
          }
          previousEnd = currentEnd
        })

        if (detectedNonZeroTextLength) {
          // Rotate labels if overlap is detected
          if (hasOverlap) {
            tickLabelsSelection
              .attr("transform", "rotate(-90)")
              .style("text-anchor", "end")
              .attr("x", -8)
              .attr("y", -6)
          }
          this.axisModel.setLabelsAreRotated(hasOverlap)
        }
      })
    }
  }
}
