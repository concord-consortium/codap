import {action, computed, makeObservable, observable} from "mobx"
import {
  format,
  NumberValue, ScaleBand, scaleBand, ScaleLinear, scaleLinear, scaleLog, ScaleOrdinal, scaleOrdinal
} from "d3"
import {AxisScaleType, IScaleType, ScaleNumericBaseType} from "../axis-types"

interface IDataCoordinate {
  cell: number
  data: number | string
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
  // Subaxes copy this scale to do their rendering because they need to change the range.
  scale: AxisScaleType  // d3 scale whose range is the entire axis length.

  constructor({scaleType, orientation}: IMultiScaleProps) {
    this.scaleType = scaleType
    this.orientation = orientation
    this.scale = scaleTypeToD3Scale(scaleType)
    makeObservable(this)
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
    return this.scale.domain()
  }

  @action setScaleType(scaleType: IScaleType) {
    this.scaleType = scaleType
    this.scale = scaleTypeToD3Scale(scaleType)
  }

  @action setLength(length: number) {
    this.length = length
    this.scale.range(this.orientation === 'horizontal' ? [0, this.length] : [this.length, 0])
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

  @action incrementChangeCount() {
    this.changeCount++
  }

  getScreenCoordinate(dataCoord: IDataCoordinate): number {
    let scaleCoord = 0
    switch (this.scaleType) {
      case "linear":
      case "log":
        scaleCoord = (this.scale as ScaleLinear<number, number>)(Number(dataCoord.data))
        break
      case "ordinal":
      case "band":
        scaleCoord = (this.scale as ScaleBand<string>)(String(dataCoord.data)) ?? 0
    }
    return dataCoord.cell * this.cellLength + scaleCoord
  }

  getDataCoordinate(screenCoordinate: number) {
    if (['linear', 'log'].includes(this.scaleType) && this.scale) {
      const cell = Math.floor(this.cellLength / screenCoordinate),
        numericScale = this.scale as ScaleLinear<number, number>
      return {cell, data: numericScale.invert(screenCoordinate)}
    }
    return {data: NaN}
  }

  formatValueForScale(value: number) {

    function formatNumber(n: number, dom: [number, number], range: [number, number]): string {
      // Calculate the number of significant digits based on domain and range
      const resolution = (dom[1] - dom[0]) / (range[1] - range[0])
      const logResolution = Math.log10(resolution)
      const sigDigits = Math.ceil(logResolution) - 1

      // Find the scaling factor based on significant digits
      const scalingFactor = Math.pow(10, sigDigits)

      // Round the number to the nearest significant digit
      const roundedNumber = Math.round(n / scalingFactor) * scalingFactor

      // Use D3 format to generate a string with the appropriate number of decimal places
      return format('.9')(roundedNumber)
    }

    if (this.scaleType === 'linear') {
      const domain = this.scale.domain() as [number, number]
      return formatNumber(value, domain, [0, this.cellLength])
    }
    return String(value)

  }
}
