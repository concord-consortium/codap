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
    // bin midpoints are rounded to two more decimal places than bin edges
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
    let numberOfBins = Math.ceil((this.maxValue - this.minBinEdge) / this.binWidth)
    // if the maxValue is on the last bin edge, add another bin to include it
    if ((this.getBinForValue(this.maxValue) ?? 0) >= numberOfBins) {
      ++numberOfBins
    }
    return this.roundToBinEdgePrecision(this.minBinEdge + numberOfBins * this.binWidth)
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
    const binIndex = (value - this.minBinEdge) / this.binWidth
    // Numbers in JS carry about 16 significant digits, so binIndex can be off by an error proportional to the size
    // of the values relative to the bin width. A tolerance of 1e-14 of that ratio is comfortably above the error
    // and far below any meaningful difference in the data, so values within it of a bin edge are treated as on it.
    const tolerance = 1e-14 * (Math.abs(value) + Math.abs(this.minBinEdge)) / this.binWidth
    const nearestEdge = Math.round(binIndex)
    return Math.abs(binIndex - nearestEdge) <= tolerance ? nearestEdge : Math.floor(binIndex)
  }

  getBinMidpoint(binNumber?: number): number | undefined {
    if (!this.binWidth || this.minBinEdge == null || binNumber == null) return undefined
    return this.roundToBinValuePrecision(this.minBinEdge + (binNumber + 0.5) * this.binWidth)
  }
}

export const kEmptyBinDetails = new BinDetails(NaN, NaN)
