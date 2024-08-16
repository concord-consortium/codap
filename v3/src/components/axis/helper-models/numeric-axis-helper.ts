import { format, ScaleLinear, select } from "d3"
import { between } from "../../../utilities/math-utils"
import { isNumericAxisModel } from "../models/axis-model"
import { transitionDuration } from "../../data-display/data-display-types"
import { computeBestNumberOfTicks } from "../axis-utils"
import { AxisScaleType, otherPlace } from "../axis-types"
import { AxisHelper, IAxisHelperArgs } from "./axis-helper"

export interface INumericAxisHelperArgs extends IAxisHelperArgs {
  showScatterPlotGridLines: boolean
}
export class NumericAxisHelper extends AxisHelper {
  showScatterPlotGridLines: boolean

  constructor(props: INumericAxisHelperArgs) {
    super(props)
    this.showScatterPlotGridLines = props.showScatterPlotGridLines
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

  render() {
    const numericScale = this.multiScale?.scaleType === "linear"
      ? this.multiScale.numericScale?.copy().range(this.newRange) as ScaleLinear<number, number>
      : undefined
    if (!isNumericAxisModel(this.axisModel) || !numericScale) return

    select(this.subAxisElt).selectAll('*').remove()
    this.renderAxisLine()

    const axisScale = this.axis(numericScale).tickSizeOuter(0).tickFormat(format('.9'))
    const duration = this.isAnimating() ? transitionDuration : 0
    if (!this.isVertical && this.displayModel.hasDraggableNumericAxis(this.axisModel)) {
      axisScale.tickValues(numericScale.ticks(computeBestNumberOfTicks(numericScale)))
    } else if (!this.displayModel.hasDraggableNumericAxis(this.axisModel)) {
      const formatter = (value: number) => this.multiScale?.formatValueForScale(value) ?? ""
      const {tickValues, tickLabels} = this.displayModel.nonDraggableAxisTicks(formatter)
      axisScale.tickValues(tickValues)
      axisScale.tickFormat((d, i) => tickLabels[i])
    }
    select(this.subAxisElt)
      .attr("transform", this.initialTransform)
      .transition().duration(duration)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore types are incompatible
      .call(axisScale).selectAll("line,path")
      .style("stroke", "lightgrey")
      .style("stroke-opacity", "0.7")

    this.showScatterPlotGridLines && this.renderScatterPlotGridLines()
  }
}
