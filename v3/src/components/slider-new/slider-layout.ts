import { action, makeObservable, observable } from "mobx"
import { AxisBounds, AxisPlace, IScaleType } from "../axis/axis-types"
import { IAxisLayout } from "../axis/models/axis-layout-context"
import { MultiScale } from "../axis/models/multi-scale"
import { kDefaultSliderAxisHeight, kDefaultSliderAxisTop, kDefaultSliderHeight, kDefaultSliderWidth,
  kSliderWidthLayoutAdj } from "./slider-types"

export class SliderAxisLayout implements IAxisLayout {
  @observable sliderWidth = kDefaultSliderWidth
  @observable sliderHeight = kDefaultSliderHeight
  @observable axisBounds?: AxisBounds
  axisMultiScale: MultiScale = new MultiScale({scaleType: "linear", orientation: "horizontal"})
  desiredExtent?: number

  constructor() {
    makeObservable(this)
  }

  @action setTileExtent(width: number, height: number) {
    this.sliderWidth = width - kSliderWidthLayoutAdj
    this.sliderHeight = height
    this.axisMultiScale.setLength(this.sliderWidth)
  }

  getAxisLength(place: AxisPlace) {
    return this.sliderWidth
  }

  getAxisBounds(place: AxisPlace) {
    return this.axisBounds
  }

  getAxisMultiScale(place: AxisPlace) {
    return this.axisMultiScale
  }

  getAxisScale(place: AxisPlace) {
    return this.axisMultiScale.scale
  }

  @action setAxisScaleType(place: AxisPlace, scaleType: IScaleType) {
    this.axisMultiScale.setLength(this.sliderWidth)
    this.axisMultiScale.setScaleType(scaleType)
  }

  @action setDesiredExtent(place: any, extent: number) {
    this.desiredExtent = extent
  }

  getDesiredExtent(place: AxisPlace) {
    return this.desiredExtent ?? kDefaultSliderAxisHeight
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
