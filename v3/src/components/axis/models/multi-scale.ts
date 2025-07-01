import { action, comparer, computed, makeObservable, observable } from "mobx"
import {
  format, NumberValue, ScaleBand, scaleBand, scaleLinear, scaleLog, ScaleOrdinal, scaleOrdinal
} from "d3"
import { ICategorySet } from "../../../models/data/category-set"
import { DatePrecision, formatDate } from "../../../utilities/date-utils"
import { mstReaction } from "../../../utilities/mst-reaction"
import { AxisScaleType, IScaleType, ScaleNumericBaseType } from "../axis-types"

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
 * This class is used by plots to compute screen coordinates from data coordinates. It can also invert
 * the process, computing data coordinates from screen coordinates.
 * One instance is assigned to each axis place. Only 'left', 'bottom' and 'rightNumeric' places ever have
 * more than one repetition, and these only when a 'rightCat' or 'top' attribute is present.
 */
export class MultiScale {
  @observable scaleType: IScaleType
  @observable repetitions = 1
  @observable length = 0
  @observable numericDomain: AxisExtent = [0, 1] // Make domain observable
  @observable orientation: "horizontal" | "vertical"
  @observable changeCount = 0
  @observable categorySet: ICategorySet | undefined
  // SubAxes copy this scale to do their rendering because they need to change the range.
  scale: AxisScaleType  // d3 scale whose range is the entire axis length.
  categoriesReactionDisposer?: () => void

  constructor({scaleType, orientation}: IMultiScaleProps) {
    this.scaleType = scaleType
    this.orientation = orientation
    this.scale = scaleTypeToD3Scale(scaleType)
    makeObservable(this)
  }

  cleanup() {
    this.categoriesReactionDisposer?.()
  }

  @computed get numericScale() {
    return ["linear", "log"].includes(this.scaleType)
      ? this.scale as ScaleNumericBaseType
      : undefined
  }

  @computed get bandScale() {
    return this.scaleType === "band"
      ? this.scale as ScaleBand<string>
      : undefined
  }

  @computed get categoricalScale() {
    return this.scaleType === "ordinal"
      ? this.scale as ScaleOrdinal<string, any>
      : this.scaleType === "band"
        ? this.scale as ScaleBand<string>
        : undefined
  }

  get categoryValues() {
    return this.categoricalScale?.domain() ?? []
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

  // The resolution is the number of data units per pixel.
  @computed get resolution() {
    const domain = this.numericDomain
    const range: AxisExtent = this.cellLength
      ? [0, this.cellLength]
      : this.numericScale?.range() as Maybe<AxisExtent> ?? [0, 1]
    return this.numericScale && domain ? (domain[1] - domain[0]) / (range[1] - range[0]) : undefined
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
    this.categoriesReactionDisposer?.()

    this.categorySet = categorySet

    if (categorySet) {
      this.categoriesReactionDisposer = mstReaction(
        () => this.categoryValues,
        values => this.updateCategoricalDomain(values),
        {name: "MultiScale.updateCategoricalDomain", equals: comparer.structural, fireImmediately: true},
        this.categorySet
      )
    }
  }

  @action updateCategoricalDomain(values: string[]) {
    this.setCategoricalDomain(values)
  }

  @action setLength(length: number) {
    this.length = length
    this._setRangeFromLength()
  }

  @action setRepetitions(repetitions: number) {
    this.repetitions = repetitions
  }

  @action setNumericDomain(domain: Iterable<NumberValue>) {
    const newDomain = domain as AxisExtent
    if (!isFinite(newDomain[0]) || !isFinite(newDomain[1])) return
    this.numericDomain = newDomain
    this.numericScale?.domain(newDomain)
  }

  @action setCategoricalDomain(domain: Iterable<string>) {
    if (this.scaleType !== "band") this.setScaleType("band")  // Ensure we are using a band scale for categorical data
    this.categoricalScale?.domain(domain)
    this.incrementChangeCount()
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
   *   If isDate is true, the value is the number of seconds since the epoch.
   * **/
  formatValueForScale(value: number, isDate = false,
                      dateMultipleOfUnit: DatePrecision | string = ""): string {
    const formatNumber = (n: number): string => {
      const resolution = this.resolution ?? 1
      // Calculate the number of significant digits based on domain and range
      const logResolution = Math.log10(resolution)
      const sigDigits = Math.ceil(logResolution) - 1

      // Find the scaling factor based on significant digits
      const scalingFactor = Math.pow(10, sigDigits)

      // Round the number to the nearest significant digit
      const roundedNumber = Math.round(n / scalingFactor) * scalingFactor

      // Use D3 format to generate a string with the appropriate number of decimal places
      return format('.9')(roundedNumber)
    }

    const formatDatePrecisionArr = [DatePrecision.Year, DatePrecision.Month, DatePrecision.Day, DatePrecision.Hour]
    const formatSliderInputDate = (n: number): string => {
      if (isDate && formatDatePrecisionArr.includes(dateMultipleOfUnit as DatePrecision)) {
        return formatDate(n * 1000, dateMultipleOfUnit as DatePrecision) ?? ''
      } else { return formatDate(n * 1000, DatePrecision.Minute) ?? '' }
    }

    return isDate
             ? formatSliderInputDate(value)
             : this.resolution ? formatNumber(value) : String(value)
  }
}
