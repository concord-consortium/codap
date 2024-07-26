import { select } from "d3"
import { isVertical } from "../../axis-graph-shared"
import { AxisBounds, AxisPlace, axisPlaceToAxisFn } from "../axis-types"
import { IAxisModel } from "../models/axis-model"
import { IDataDisplayContentModel } from "../../data-display/models/data-display-content-model"
import { IAxisLayout } from "../models/axis-layout-context"
import { MultiScale } from "../models/multi-scale"

export class AxisHelper {
  multiScale: MultiScale | undefined

  constructor(
    protected displayModel: IDataDisplayContentModel,
    protected subAxisIndex: number,
    protected axisPlace: AxisPlace,
    protected subAxisElt: SVGGElement | null,
    protected axisModel: IAxisModel,
    protected layout: IAxisLayout,
    protected isAnimating: () => boolean
  ) {
    this.multiScale = this.layout.getAxisMultiScale(this.axisPlace)
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
      .style("stroke", "darkgrey")
      .style("stroke-opacity", "0.7")
  }

}

export class EmptyAxisHelper extends AxisHelper {
  constructor(...args: ConstructorParameters<typeof AxisHelper>) {
    super(...args)
  }

  render() {
    this.renderAxisLine()
  }
}
