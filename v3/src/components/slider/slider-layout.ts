import { ScaleContinuousNumeric, scaleLinear } from "d3"
import { action, observable } from "mobx"
import { AxisBounds, AxisPlace } from "../axis/axis-types"

export const kDefaultSliderWidth = 300
export const kDefaultSliderAxisTop = 0
export const kDefaultSliderAxisHeight = 20

type SliderScale = ScaleContinuousNumeric<number, number>

export class SliderLayout {
  @observable sliderWidth = kDefaultSliderWidth
  @observable axisBounds?: AxisBounds
  axisScale: SliderScale = scaleLinear()
  desiredExtent: number | undefined

  axisLength(place: AxisPlace) {
    return this.sliderWidth
  }

  getAxisBounds() {
    return this.axisBounds
  }

  @action setAxisBounds(place: AxisPlace, bounds?: AxisBounds) {
    this.axisBounds = bounds
  }

  getAxisScale() {
    return this.axisScale
  }

  @action setAxisScale(place: AxisPlace, scale: SliderScale) {
    scale.range([0, this.sliderWidth])
    this.axisScale = scale
  }

  @action setDesiredExtent(place: any, extent: number) {
    this.desiredExtent = extent
  }

  getComputedBounds(place: AxisPlace) {
    return {
      left: 0,
      top: kDefaultSliderAxisTop,
      width: this.sliderWidth,
      height: this.desiredExtent ?? kDefaultSliderAxisHeight
    }
  }
}
