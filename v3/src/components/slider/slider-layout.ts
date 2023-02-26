import { action, makeObservable, observable } from "mobx"
import { AxisBounds, AxisPlace } from "../axis/axis-types"
import {
  kDefaultSliderAxisHeight, kDefaultSliderAxisTop, kDefaultSliderHeight, kDefaultSliderWidth
} from "./slider-types"
import {MultiScale} from "../graph/models/multi-scale"
import {IScaleType} from "../axis/models/axis-model"

export class SliderAxisLayout {
  @observable sliderWidth = kDefaultSliderWidth
  @observable sliderHeight = kDefaultSliderHeight
  @observable axisBounds?: AxisBounds
  axisScale: MultiScale = new MultiScale({scaleType: "linear", orientation: "horizontal"})
  desiredExtent?: number

  constructor() {
    makeObservable(this)
  }

  @action setParentExtent(width: number, height: number) {
    this.sliderWidth = width
    this.sliderHeight = height
    this.axisScale.setLength(this.sliderWidth)
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

  @action setAxisScaleType(place: AxisPlace, scaleType: IScaleType) {
    this.axisScale.setLength(this.sliderWidth)
    this.axisScale.setScaleType(scaleType)
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
