import { select } from "d3"
import { isVertical } from "../../axis-graph-shared"
import { AxisBounds, axisPlaceToAxisFn } from "../axis-types"
import { IAxisModel } from "../models/axis-model"
import { IDataDisplayContentModel } from "../../data-display/models/data-display-content-model"
import { IAxisLayout } from "../models/axis-layout-context"
import { MultiScale } from "../models/multi-scale"

export interface IAxisHelperArgs {
  displayModel: IDataDisplayContentModel
  subAxisIndex: number
  subAxisElt: SVGGElement | null
  axisModel: IAxisModel
  layout: IAxisLayout
  isAnimating: () => boolean
}

export class AxisHelper {
  displayModel: IDataDisplayContentModel
  subAxisIndex: number
  subAxisElt: SVGGElement | null
  axisModel: IAxisModel
  layout: IAxisLayout
  isAnimating: () => boolean
  multiScale: MultiScale | undefined

  constructor(props: IAxisHelperArgs) {
    this.displayModel = props.displayModel
    this.subAxisIndex = props.subAxisIndex
    this.subAxisElt = props.subAxisElt
    this.axisModel = props.axisModel
    this.layout = props.layout
    this.isAnimating = props.isAnimating
    this.multiScale = this.layout.getAxisMultiScale(this.axisPlace)
  }

  get axisPlace() {
    return this.axisModel.place
  }

  get dataConfig() {
    return this.displayModel.dataConfiguration
  }

  get initialTransform() {
    const axisBounds = this.layout.getComputedBounds(this.axisPlace) as AxisBounds
    return (this.axisPlace === 'left')
      ? `translate(${axisBounds.left + axisBounds.width}, ${axisBounds.top})`
      : (this.axisPlace === 'top')
        ? `translate(${axisBounds.left}, ${axisBounds.top + axisBounds.height})`
        : `translate(${axisBounds.left}, ${axisBounds.top})`
  }

  get isVertical() {
    return isVertical(this.axisPlace)
  }

  get subAxisLength() {
    return this.multiScale?.cellLength ?? 0
  }

  get axis() {
    return axisPlaceToAxisFn(this.axisPlace)
  }

  get rangeMin() {
    return this.subAxisIndex * this.subAxisLength
  }

  get rangeMax() {
    return this.rangeMin + this.subAxisLength
  }

  renderAxisLine() {
    select(this.subAxisElt).selectAll('*').remove()
    select(this.subAxisElt)
      .attr("transform", this.initialTransform)
      .append('line')
      .attr('x1', 0)
      .attr('x2', this.isVertical ? 0 : this.subAxisLength)
      .attr('y1', 0)
      .attr('y2', this.isVertical ? this.subAxisLength : 0)
      .style("stroke", "darkgray")
      .style("stroke-opacity", "0.7")
  }

}

export class EmptyAxisHelper extends AxisHelper {

  render() {
    this.renderAxisLine()
  }
}
