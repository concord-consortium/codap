import {action, computed, IReactionDisposer, makeObservable, observable, reaction} from "mobx"
import {
  format, NumberValue, ScaleBand, scaleBand, scaleLinear, scaleLog, ScaleOrdinal, scaleOrdinal
} from "d3"
import {AxisScaleType, IScaleType, ScaleNumericBaseType} from "../axis-types"
import {ICategorySet} from "../../../models/data/category-set"

interface IDataCoordinate {
  cell: number
  data: number | string
}

interface INumericDataCoordinate extends IDataCoordinate {
  data: number
}

interface IMultiScaleProps {
  scaleType: IScaleType
  orientation: "horizontal" | "vertical"
}

export const scaleTypeToD3Scale = (iScaleType: IScaleType) => {
  switch (iScaleType) {
    case "ordinal":
      return scaleOrdinal()
    case "band":
      return scaleBand()
    case "linear":
      return scaleLinear()
    case "log":
      return scaleLog()
  }
}

export type AxisExtent = [number, number]

/**
 * This class is used to by plots to compute screen coordinates from data coordinates. It can also invert
 * the process, computing data coordinates from screen coordinates.
 * One instance is assigned to each axis place. Only 'left', 'bottom' and 'rightNumeric' places ever have
 * more than one repetition, and these only when a 'rightCat' or 'top' axis is present.
 */
export class MultiScale {
  @observable scaleType: IScaleType
  @observable repetitions = 1
  @observable length = 0
  @observable orientation: "horizontal" | "vertical"
  @observable changeCount = 0
  @observable categorySet: ICategorySet | undefined
  // SubAxes copy this scale to do their rendering because they need to change the range.
  scale: AxisScaleType  // d3 scale whose range is the entire axis length.
  disposers: IReactionDisposer[] = []

  constructor({scaleType, orientation}: IMultiScaleProps) {
    this.scaleType = scaleType
    this.orientation = orientation
    this.scale = scaleTypeToD3Scale(scaleType)
    makeObservable(this)
    this.disposers.push(this.reactToCategorySetChange())
  }

  cleanup() {
    this.disposers.forEach(disposer => disposer())
  }

  @computed get numericScale() {
    return ["linear", "log"].includes(this.scaleType)
      ? this.scale as ScaleNumericBaseType
      : undefined
  }

  @computed get categoricalScale() {
    return this.scaleType === "ordinal"
      ? this.scale as ScaleOrdinal<string, any>
      : this.scaleType === "band"
        ? this.scale as ScaleBand<string>
        : undefined
  }

  @computed get cellLength() {
    return this.length / this.repetitions
  }

  @computed get domain() {
    // note that a change of `scale` will invalidate this result, but
    // a change in domain values will not since they're not observable
    return this.scale.domain()
  }

  @computed get range() {
    // note that a change of `scale` will invalidate this result, but
    // a change in range values will not since they're not observable
    return this.scale.range()
  }

  @computed get categorySetValues() {
    return this.categorySet?.values ?? []
  }

  _setRangeFromLength() {
    this.scale.range(this.orientation === 'horizontal' ? [0, this.length] : [this.length, 0])
  }

  @action setScaleType(scaleType: IScaleType) {
    if (scaleType !== this.scaleType) {
      this.scaleType = scaleType
      this.scale = scaleTypeToD3Scale(scaleType)
      this._setRangeFromLength()
    }
  }

  @action setCategorySet(categorySet: ICategorySet | undefined) {
    this.categorySet = categorySet
    this.categoricalScale?.domain(categorySet?.values ?? [])
    this.incrementChangeCount()
  }

  @action setLength(length: number) {
    this.length = length
    this._setRangeFromLength()
  }

  @action setRepetitions(repetitions: number) {
    this.repetitions = repetitions
  }

  @action setNumericDomain(domain: Iterable<NumberValue>) {
    this.numericScale?.domain(domain)
  }

  @action setCategoricalDomain(domain: Iterable<string>) {
    this.categoricalScale?.domain(domain)
    this.incrementChangeCount()
  }

  @action reactToCategorySetChange() {
    return reaction(() => {
      return Array.from(this.categorySetValues)
    }, (categories) => {
      this.setCategoricalDomain(categories)
      this.incrementChangeCount()
    }, { name: "MultiScale.reactToCategorySetChange"})
  }

  @action incrementChangeCount() {
    this.changeCount++
  }

  getScreenCoordinate(dataCoord: IDataCoordinate): number {
    const scaleCoord = this.numericScale?.(Number(dataCoord.data)) ??
      this.categoricalScale?.(String(dataCoord.data)) ?? 0
    return dataCoord.cell * this.cellLength + scaleCoord
  }

  getDataCoordinate(screenCoordinate: number): INumericDataCoordinate {
    const numericScale = this.numericScale
    if (numericScale) {
      const cell = this.cellLength && screenCoordinate ? Math.floor(this.cellLength / screenCoordinate) : 0
      return {cell, data: numericScale.invert(screenCoordinate)}
    }
    return {cell: 0, data: NaN}
  }

  /** To display values for a numeric axis we use just the number of significant figures required to distinguish
   *   the value for one screen pixel from the value for the adjacent screen pixel.
   * **/
  formatValueForScale(value: number) {
    function formatNumber(n: number, _domain: AxisExtent, _range: AxisExtent): string {
      // Calculate the number of significant digits based on domain and range
      const resolution = (_domain[1] - _domain[0]) / (_range[1] - _range[0])
      const logResolution = Math.log10(resolution)
      const sigDigits = Math.ceil(logResolution) - 1

      // Find the scaling factor based on significant digits
      const scalingFactor = Math.pow(10, sigDigits)

      // Round the number to the nearest significant digit
      const roundedNumber = Math.round(n / scalingFactor) * scalingFactor

      // Use D3 format to generate a string with the appropriate number of decimal places
      return format('.9')(roundedNumber)
    }

    const domain = this.numericScale?.domain() as AxisExtent | undefined
    const range: AxisExtent = this.cellLength
      ? [0, this.cellLength]
      : this.numericScale?.range() as AxisExtent | undefined ?? [0, 1]
    return domain ? formatNumber(value, domain, range) : String(value)
  }
}
