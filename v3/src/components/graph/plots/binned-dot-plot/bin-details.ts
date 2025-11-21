import { getPrecisionForValue, roundToPrecision } from "../../../../utilities/math-utils"

export class BinDetails {
  minValue: number
  maxValue: number
  binWidth?: number
  binAlignment?: number
  binWidthPrecision?: number
  binAlignmentPrecision?: number
  binEdgePrecision?: number
  binValuePrecision?: number
  minBinEdge: number
  maxBinEdge: number
  totalNumberOfBins: number

  constructor(minValue: number, maxValue: number, binWidth?: number, binAlignment?: number) {
    this.minValue = minValue
    this.maxValue = maxValue
    this.binWidth = binWidth || this.defaultBinWidth()
    this.binWidthPrecision = getPrecisionForValue(this.binWidth)
    this.binAlignment = binAlignment ?? this.defaultBinAlignment()
    // alignment precision is allowed two more decimal places than bin width precision
    this.binAlignmentPrecision = Math.min(this.binWidthPrecision + 2, getPrecisionForValue(this.binAlignment))
    // edge precision is the max of width and alignment precisions
    this.binEdgePrecision = Math.max(this.binWidthPrecision ?? 0, this.binAlignmentPrecision ?? 0)
    // bin values are rounded to two more decimal places when determining bin assignments
    this.binValuePrecision = this.binEdgePrecision + 2
    this.minBinEdge = this.getMinBinEdge() ?? 0
    this.maxBinEdge = this.getMaxBinEdge() ?? 0
    this.totalNumberOfBins = this.getTotalNumberOfBins()
  }

  get isValid(): boolean {
    return !!this.binWidth && this.binAlignment != null
  }

  defaultBinWidth() {
    if (!Number.isFinite(this.minValue) || !Number.isFinite(this.maxValue) || this.minValue === this.maxValue) {
      return undefined
    }

    const kDefaultNumberOfBins = 4

    const binRange = (this.maxValue - this.minValue) / kDefaultNumberOfBins
    // Convert to a logarithmic scale (base 10)
    const logRange = Math.log10(binRange)
    const significantDigit = Math.pow(10.0, Math.floor(logRange))
    // Determine the scale factor based on the significant digit
    const scaleFactor = Math.pow(10.0, logRange - Math.floor(logRange))
    const adjustedScaleFactor = scaleFactor < 2 ? 1 : scaleFactor < 5 ? 2 : 5
    return Math.max(significantDigit * adjustedScaleFactor, Number.MIN_VALUE)
  }

  defaultBinAlignment() {
    // default alignment is the largest multiple of binWidth less than or equal to minValue
    return this.binWidth
            ? roundToPrecision(Math.floor(this.minValue / this.binWidth) * this.binWidth, this.binWidthPrecision ?? 0)
            : undefined
  }

  roundToBinEdgePrecision(value: number): number {
    if (this.binEdgePrecision == null) return value
    const factor = Math.pow(10, this.binEdgePrecision)
    return Math.round(value * factor) / factor
  }

  roundToBinValuePrecision(value: number): number {
    if (this.binValuePrecision == null) return value
    const factor = Math.pow(10, this.binValuePrecision)
    return Math.round(value * factor) / factor
  }

  getMinBinEdge(): number | undefined {
    if (this.binWidth == null || this.binAlignment == null) return undefined

    return this.roundToBinEdgePrecision(
      this.binAlignment - Math.ceil((this.binAlignment - this.minValue) / this.binWidth) * this.binWidth
    )
  }

  getMaxBinEdge(): number | undefined {
    if (this.binWidth == null || this.minBinEdge == null) return undefined
    let maxBinEdge = this.roundToBinEdgePrecision(
      this.minBinEdge + Math.ceil((this.maxValue - this.minBinEdge) / this.binWidth) * this.binWidth
    )
    // if the maxValue is exactly on a bin edge, add another bin to include it
    if (this.maxValue === maxBinEdge) {
      maxBinEdge = this.roundToBinEdgePrecision(maxBinEdge + this.binWidth)
    }
    return maxBinEdge
  }

  getTotalNumberOfBins(): number {
    if (!this.binWidth || this.minBinEdge == null || this.maxBinEdge == null) return 0
    return Math.round((this.maxBinEdge - this.minBinEdge) / this.binWidth)
  }

  getBinEdge(binNumber: number): number | undefined {
    if (!this.binWidth || this.minBinEdge == null) return undefined
    return this.roundToBinEdgePrecision(this.minBinEdge + binNumber * this.binWidth)
  }

  getBinForValue(value: number): number | undefined {
    if (!this.binWidth || this.minBinEdge == null) return undefined
    return Math.floor(this.roundToBinValuePrecision((value - this.minBinEdge) / this.binWidth))
  }

  getBinMidpoint(binNumber?: number): number | undefined {
    if (!this.binWidth || this.minBinEdge == null || binNumber == null) return undefined
    return this.roundToBinValuePrecision(this.minBinEdge + (binNumber + 0.5) * this.binWidth)
  }
}

export const kEmptyBinDetails = new BinDetails(NaN, NaN)
