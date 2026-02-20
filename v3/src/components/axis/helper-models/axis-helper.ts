import { select } from "d3"
import { isVertical } from "../../axis-graph-shared"
import { IDataDisplayContentModel } from "../../data-display/models/data-display-content-model"
import { AxisPlace, axisPlaceToAxisFn } from "../axis-types"
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
  // Cache the axis place so it remains accessible even after the axis model is
  // removed from the MST tree (e.g., during undo). The place never changes after creation.
  private _axisPlace: AxisPlace

  constructor(props: IAxisHelperArgs) {
    this.displayModel = props.displayModel
    this.subAxisIndex = props.subAxisIndex
    this.subAxisElt = props.subAxisElt
    this.axisModel = props.axisModel
    this._axisPlace = props.axisModel.place
    this.layout = props.layout
    this.isAnimating = props.isAnimating
    this.multiScale = this.layout.getAxisMultiScale(this.axisPlace)
    const elt = select(this.subAxisElt)
    elt.selectAll('*').remove() // clear any existing content
    // Clear SVG attributes set by D3's axis function (e.g., fill="none") so they don't
    // leak into the next axis type. D3's axis will re-set these when it renders.
    elt.attr('fill', null).attr('font-size', null).attr('font-family', null).attr('text-anchor', null)
  }

  get axisPlace() {
    return this._axisPlace
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
