import { ScaleContinuousNumeric, scaleLinear } from "d3"
import { action, makeObservable, observable } from "mobx"
import { AxisBounds, AxisPlace } from "../axis/axis-types"
import {
  kDefaultSliderAxisHeight, kDefaultSliderAxisTop, kDefaultSliderHeight, kDefaultSliderWidth
} from "./slider-types"

type SliderScale = ScaleContinuousNumeric<number, number>

export class SliderAxisLayout {
  @observable sliderWidth = kDefaultSliderWidth
  @observable sliderHeight = kDefaultSliderHeight
  @observable axisBounds?: AxisBounds
  axisScale: SliderScale = scaleLinear()
  desiredExtent?: number

  constructor() {
    makeObservable(this)
  }

  @action setParentExtent(width: number, height: number) {
    this.sliderWidth = width
    this.sliderHeight = height
  }

  getAxisLength(place: AxisPlace) {
    return this.sliderWidth
  }

  getAxisBounds(place: AxisPlace) {
    return this.axisBounds
  }

  @action setAxisBounds(place: AxisPlace, bounds?: AxisBounds) {
    this.axisBounds = bounds
  }

  getAxisScale(place: AxisPlace) {
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
