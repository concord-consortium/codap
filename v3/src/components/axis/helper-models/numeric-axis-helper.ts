import { format, ScaleLinear, select } from "d3"
import { between } from "../../../utilities/math-utils"
import { transitionDuration } from "../../data-display/data-display-types"
import { computeBestNumberOfTicks, computeBestNumberOfVerticalAxisTicks, getStringBounds } from "../axis-utils"
import { AxisScaleType, otherPlace } from "../axis-types"
import { IAxisProvider } from "../models/axis-provider"
import { isNonDateNumericAxisModel } from "../models/numeric-axis-models"
import { AxisHelper, IAxisHelperArgs } from "./axis-helper"

export interface INumericAxisHelperArgs extends IAxisHelperArgs {
  showScatterPlotGridLines: boolean
  showZeroAxisLine?: boolean
  axisProvider: IAxisProvider
}

export class NumericAxisHelper extends AxisHelper {
  showScatterPlotGridLines: boolean
  showZeroAxisLine?: boolean
  axisProvider: IAxisProvider

  constructor(props: INumericAxisHelperArgs) {
    super(props)
    this.showScatterPlotGridLines = props.showScatterPlotGridLines
    this.showZeroAxisLine = props.showZeroAxisLine
    this.axisProvider = props.axisProvider
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

    this.renderAxisLine()

    const hasDraggableNumericAxis = this.axisProvider.hasDraggableNumericAxis(this.axisModel)

    const axisScale = this.axis(numericScale).tickSizeOuter(0).tickFormat(format('.9'))
    const duration = this.isAnimating() ? transitionDuration : 0
    if (!hasDraggableNumericAxis) {
      const formatter = (value: number) => this.multiScale?.formatValueForScale(value) ?? ""
      const {tickValues, tickLabels} = this.axisProvider.nonDraggableAxisTicks(formatter) ||
      {tickValues: [], tickLabels: []}
      axisScale.tickValues(tickValues)
      axisScale.tickFormat((d, i) => tickLabels[i])
    }
    else {
      const numberOfTicks = this.isVertical ? computeBestNumberOfVerticalAxisTicks(numericScale)
        : computeBestNumberOfTicks(numericScale)
      axisScale.tickValues(numericScale.ticks(numberOfTicks))
    }
    if (this.axisModel.integersOnly) {
      // Note: This has the desirable effect of removing the decimal point from the tick labels,
      // but it doesn't prevent the tick marks from showing for fractional values or grid lines
      // from being drawn at fractional values.
      axisScale.tickFormat((d, i) => {
        return Number.isInteger(d) ? d.toString() : ""
      })
    }

    try {
      const mainAxisTickCount = subAxisSelection.selectAll(":scope > .tick").size()
      const mainAxisTextCount = subAxisSelection.selectAll(":scope > .tick > text").size()
      if (mainAxisTickCount !== mainAxisTextCount) {
        subAxisSelection.selectAll("*").remove()
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

      if (this.axisModel.place === 'bottom' && !hasDraggableNumericAxis && this.multiScale && this.displayModel) {
        const formatter = (value: number) => this.multiScale?.formatValueForScale(value) || ""
        const {tickLabels} = this.displayModel.nonDraggableAxisTicks(formatter)
        // Detect overlapping tick labels
        const tickLabelsSelection = subAxisSelection.selectAll(".tick text")
        let hasOverlap = false
        let previousEnd = 0
        let detectedNonZeroTextLength = false

        tickLabelsSelection.each(function (_, i) {
          const textWidth = getStringBounds(tickLabels[i]).width
          const currentNode = this as SVGTextElement
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
              .transition().duration(duration)
              .style("text-anchor", "end")
              .attr("x", -8)
              .attr("y", -6)
          }
          this.axisModel.setLabelsAreRotated(hasOverlap)
        }
      }
    }
    catch (error) {
      // todo: Figure out how to prevent errors from d3 axis rendering
      // This error occurs when a graph has a numeric axis and all the cases in the dataset are deleted
      // We're using this temporary hack to be able to move on past CDOAP-1016
      console.error("Error rendering numeric axis:", error)
      select(this.subAxisElt).selectAll('*').remove() // clear any existing content
    }
  }
}
