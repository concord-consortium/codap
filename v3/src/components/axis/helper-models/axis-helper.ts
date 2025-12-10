import { select } from "d3"
import { isVertical } from "../../axis-graph-shared"
import { IDataDisplayContentModel } from "../../data-display/models/data-display-content-model"
import { axisPlaceToAxisFn } from "../axis-types"
import { IAxisLayout } from "../models/axis-layout-context"
import { IAxisModel } from "../models/axis-model"
import { MultiScale } from "../models/multi-scale"

export interface IAxisHelperArgs {
  displayModel?: IDataDisplayContentModel
  subAxisIndex: number
  subAxisElt: SVGGElement | null
  axisModel: IAxisModel
  layout: IAxisLayout
  isAnimating: () => boolean
}

export class AxisHelper {
  displayModel?: IDataDisplayContentModel
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
    select(this.subAxisElt).selectAll('*').remove() // clear any existing content
  }

  get axisPlace() {
    return this.axisModel.place
  }

  get dataConfig() {
    return this.displayModel?.dataConfiguration
  }

  get initialTransform() {
    const axisBounds = this.layout.getComputedBounds(this.axisPlace)
    if (!axisBounds) throw new Error("AxisLayout can't compute bounds")
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
    select(this.subAxisElt).selectAll('.axis-line').remove()
    select(this.subAxisElt)
      .attr("transform", this.initialTransform)
      .append('line')
      .attr("class", "axis-line")
      .attr('x1', 0)
      .attr('x2', this.isVertical ? 0 : this.subAxisLength)
      .attr('y1', 0)
      .attr('y2', this.isVertical ? this.subAxisLength : 0)
      .style("stroke", "darkgray")
      .style("stroke-opacity", "0.7")
  }

  render() {
    /* istanbul ignore next */
    throw new Error("Subclass should override")
  }
}

export class EmptyAxisHelper extends AxisHelper {

  render() {
    select(this.subAxisElt).selectAll('*').remove()
    this.renderAxisLine()
  }
}
