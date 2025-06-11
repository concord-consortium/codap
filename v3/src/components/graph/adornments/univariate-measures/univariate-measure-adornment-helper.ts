import { clsx } from "clsx"
import { select } from "d3"
import { isFiniteNumber } from "../../../../utilities/math-utils"
import { t } from "../../../../utilities/translation/translate"
import { ScaleNumericBaseType } from "../../../axis/axis-types"
import { IDataConfigurationModel } from "../../../data-display/models/data-configuration-model"
import { Point } from "../../../data-display/data-display-types"
import { IGraphDataConfigurationModel } from "../../models/graph-data-configuration-model"
import { GraphLayout } from "../../models/graph-layout"
import { valueLabelString } from "../../utilities/graph-utils"
import { IAdornmentsStore } from "../store/adornments-store"
import { isBoxPlotAdornment } from "./box-plot/box-plot-adornment-model"
import { kMeanType } from "./mean/mean-adornment-types"
import { kMedianType } from "./median/median-adornment-types"
import { kErrorBarStrokeColor, kStandardErrorValueTitleKey } from "./standard-error/standard-error-adornment-types"
import { IUnivariateMeasureAdornmentModel } from "./univariate-measure-adornment-model"
import { ILineCoords, ILineSpecs, IRange, IRangeSpecs, IRectSpecs, IValue } from "./univariate-measure-adornment-types"

interface IBlocksOtherMeasure {
  adornmentsStore: IAdornmentsStore
  attrId: string
  dataConfig: IDataConfigurationModel
  isVertical: boolean
}

export class UnivariateMeasureAdornmentHelper {
  cellKey: Record<string, string>
  classFromKey = ""
  containerId = ""
  instanceKey = ""
  layout: GraphLayout
  measureSlug = ""
  model: IUnivariateMeasureAdornmentModel

  constructor (
    cellKey: Record<string, string>,
    layout: GraphLayout,
    model: IUnivariateMeasureAdornmentModel,
    containerId?: string
  ) {
    this.cellKey = cellKey
    this.classFromKey = model.classNameFromKey(cellKey)
    this.containerId = containerId ?? ""
    this.instanceKey = model.instanceKey(cellKey)
    this.layout = layout
    this.measureSlug = model.type.toLowerCase().replace(/ /g, "-")
    this.model = model
  }

  // There is a convenient fiction in the types of these scales in that one of them is _actually_
  // numeric, but the other will generally _not_ be numeric. The logic below (e.g. `isVertical`)
  // is designed to guarantee that only the numeric scale will be asked to perform numeric
  // calculations, but that functions like `range()` can be called for either scale.
  // This could probably be rewritten in terms of `primaryScale()` and `secondaryScale()`
  // which would make the code clearer and could be correctly typed.

  get xScale() {
    return this.layout.getAxisScale("bottom") as ScaleNumericBaseType
  }

  get yScale() {
    return this.layout.getAxisScale("left") as ScaleNumericBaseType
  }

  generateIdString = (elementType: string) => {
    return `${this.measureSlug}-${elementType}-${this.containerId}${this.classFromKey ? `-${this.classFromKey}` : ""}`
  }

  formatValueForScale(isVertical: boolean, value: number | undefined) {
    const multiScale = isVertical
      ? this.layout.getAxisMultiScale("bottom")
      : this.layout.getAxisMultiScale("left")
    return value != null
      ? multiScale
        ? multiScale.formatValueForScale(value)
        : valueLabelString(value)
      : ""
  }

  // Calculate the coordinates for the line endpoints
  // index = 1 for the left/bottom endpoint, 2 for the right/top endpoint
  // isVertical = true for vertical lines, false for horizontal lines
  // cellCounts = {x: number of columns, y: number of rows}
  // secondaryAxisX = x-coordinate of the secondary axis
  // secondaryAxisY = y-coordinate of the secondary axis
  // Returns an object with x and y coordinates
  calculateLineCoords = (
    value: number, index: number, isVertical: boolean, cellCounts: Record<string, number>,
    secondaryAxisX=0, secondaryAxisY=0
  ) => {
    const [left, right] = this.xScale?.range() || [0, 1]
    const [bottom, top] = this.yScale?.range() || [0, 1]
    const coordX = index === 1 ? right : left
    const coordY = index === 1 ? top : bottom
    const secondaryAxisXReal = !isVertical && isBoxPlotAdornment(this.model)
      ? secondaryAxisX
      : coordX / cellCounts.x
    const secondaryAxisYReal = isVertical && isBoxPlotAdornment(this.model)
      ? secondaryAxisY
      : coordY / cellCounts.y
    const x = !isVertical ? secondaryAxisXReal : this.xScale(value) / cellCounts.x
    const y = isVertical ? secondaryAxisYReal : this.yScale(value) / cellCounts.y
    return {x, y}
  }

  calculateRangeCoords = (
    rangeVal: number, coords: ILineCoords, isVertical: boolean, cellCounts: Record<string, number>
  ) => {
    const { x1, x2, y1, y2 } = coords
    return {
      x1: isVertical ? this.xScale(rangeVal) / cellCounts.x : x1,
      x2: isVertical ? this.xScale(rangeVal) / cellCounts.x : x2,
      y1: isVertical ? y1 : this.yScale(rangeVal) / cellCounts.y,
      y2: isVertical ? y2 : this.yScale(rangeVal) / cellCounts.y
    }
  }

  newLine = (valueElement: SVGGElement | null, lineSpecs: ILineSpecs) => {
    if (!valueElement) return
    const { isVertical, lineClass, lineId, offset=0, x1, x2, y1, y2 } = lineSpecs
    const leftOffset = !isVertical && offset ? offset : 0
    const topOffset = isVertical && offset ? offset : 0
    return select(valueElement).append("line")
      .attr("class", lineClass)
      .attr("id", lineId)
      .attr("data-testid", lineId)
      .attr("x1", x1)
      .attr("x2", x2)
      .attr("y1", y1)
      .attr("y2", y2)
      .attr("transform", `translate(${leftOffset}, ${topOffset})`)
  }

  newRect = (valueElement: SVGGElement | null, rectSpecs: IRectSpecs) => {
    if (!valueElement) return
    const { height, isVertical, rectOffset, width, x, y } = rectSpecs
    const rectId = this.generateIdString("range")
    const rectClass = clsx("measure-range", `${this.measureSlug}-range`)
    const leftOffset = isVertical && rectOffset ? 0 : rectOffset
    const topOffset = isVertical && rectOffset ? rectOffset : 0
    return select(valueElement).append("rect")
      .attr("class", rectClass)
      .attr("id", rectId)
      .attr("data-testid", rectId)
      .attr("x", x)
      .attr("y", y)
      .attr("width", width)
      .attr("height", height)
      .attr("transform", `translate(${leftOffset}, ${topOffset})`)
  }

 /**
 * This function adds a range to the given value element. It creates a new rectangle and lines for the range.
 * It calculates the coordinates for the range based on the given parameters and appends the new elements to
 * the value element.
 *
 * @param valueElement - The SVG element to which the range is to be added.
 * @param valueObj - The object representing the value for which the range is being added.
 * @param rangeSpecs - The specifications for the range, including cell counts, coordinates, classes, offsets,
 * and secondary axis positions.
 */
 addRange = (valueElement: SVGGElement | null, valueObj: IValue, rangeSpecs: IRangeSpecs) => {
    if (!valueElement) return
    const { cellCounts, coords, coverClass, extentForSecondaryAxis="100%", isVertical, lineClass,
            lineOffset=0, rangeMin, rangeMax, rectOffset=0, secondaryAxisX=0, secondaryAxisY=0 } = rangeSpecs
    const rangeMinId = this.generateIdString("min")
    const rangeMinCoverId = this.generateIdString("min-cover")
    const rangeMaxId = this.generateIdString("max")
    const rangeMaxCoverId = this.generateIdString("max-cover")
    const rangeMinCoords = this.calculateRangeCoords(rangeMin, coords, isVertical, cellCounts)
    const rangeMaxCoords = this.calculateRangeCoords(rangeMax, coords, isVertical, cellCounts)
    const x = !isVertical ? secondaryAxisX : rangeMinCoords.x1
    const y = isVertical ? secondaryAxisY : rangeMaxCoords.y1
    const width = isVertical ? (this.xScale(rangeMax) - this.xScale(rangeMin)) / cellCounts.x : extentForSecondaryAxis
    const height = !isVertical ? (this.yScale(rangeMin) - this.yScale(rangeMax)) / cellCounts.y : extentForSecondaryAxis
    const rangeMinSpecs = {
      isVertical,
      lineClass: `${lineClass} range-line`,
      lineId: rangeMinId,
      offset: lineOffset,
      x1: rangeMinCoords.x1,
      x2: rangeMinCoords.x2,
      y1: rangeMinCoords.y1,
      y2: rangeMinCoords.y2
    }
    const rangeMinCoverSpecs = {...rangeMinSpecs, lineClass: coverClass, lineId: rangeMinCoverId}
    const rangeMaxSpecs = {
      isVertical,
      lineClass: `${lineClass} range-line`,
      lineId: rangeMaxId,
      offset: lineOffset,
      x1: rangeMaxCoords.x1,
      x2: rangeMaxCoords.x2,
      y1: rangeMaxCoords.y1,
      y2: rangeMaxCoords.y2
    }
    const rangeMaxCoverSpecs = {...rangeMaxSpecs, lineClass: coverClass, lineId: rangeMaxCoverId}

    valueObj.range = this.newRect(valueElement, {height, isVertical, rectOffset, width, x, y})
    valueObj.rangeMin = this.newLine(valueElement, rangeMinSpecs)
    valueObj.rangeMinCover = this.newLine(valueElement, rangeMinCoverSpecs)
    valueObj.rangeMax = this.newLine(valueElement, rangeMaxSpecs)
    valueObj.rangeMaxCover = this.newLine(valueElement, rangeMaxCoverSpecs)
  }

  // converts a world value to a percentage of the axis range
  xScalePct = (value: number) => {
    const range = this.xScale.range()
    return this.xScale(value) / (range[1] - range[0])
  }

  // converts a world value to a percentage of the axis range
  yScalePct = (value: number) => {
    const range = this.yScale.range()
    return this.yScale(value) / (range[0] - range[1])
  }

  // converts a pixel value to a percentage of the axis range
  yRangePct = (value: number) => {
    const range = this.yScale.range()
    return value / Math.abs(range[0] - range[1])
  }

  adornmentSpecs = (
    attrId: string, dataConfig: IDataConfigurationModel, value: number, isVertical: boolean,
    cellCounts: Record<string, number>, secondaryAxisX=0, secondaryAxisY=0
  ) => {
    const displayValue = this.formatValueForScale(isVertical, value)
    const plotValue = value
    const measureRange: IRange = attrId && this.model.hasRange
      ? this.model.computeMeasureRange(attrId, this.cellKey, dataConfig)
      : {}
    const rangeValue = measureRange.min != null ? value - measureRange.min : undefined
    const displayRange = this.formatValueForScale(isVertical, rangeValue)
    const {x: x1, y: y1} =
      this.calculateLineCoords(plotValue, 1, isVertical, cellCounts, secondaryAxisX, secondaryAxisY)
    const {x: x2, y: y2} =
      this.calculateLineCoords(plotValue, 2, isVertical, cellCounts, secondaryAxisX, secondaryAxisY)
    const lineClass = clsx("measure-line", `${this.measureSlug}-line`)
    const lineId = this.generateIdString("line")
    const coverClass = clsx("measure-cover", `${this.measureSlug}-cover`)
    const coverId = this.generateIdString("cover")

    return {
      coords: {x1, x2, y1, y2},
      coverClass,
      coverId,
      displayRange,
      displayValue,
      lineClass,
      lineId,
      measureRange,
      plotValue
    }
  }

  blocksOtherMeasure(props: IBlocksOtherMeasure) {
    const affectedMeasureTypes = [kMeanType, kMedianType]
    if (!affectedMeasureTypes.includes(this.model.type)) return false
    const { adornmentsStore, attrId, dataConfig, isVertical } = props
    const thisMeasureValue = this.model.measureValue(attrId, this.cellKey, dataConfig)
    if (!isFiniteNumber(thisMeasureValue)) return false
    const scale = isVertical ? this.xScale : this.yScale
    const otherMeasureType = this.model.type === kMeanType ? kMedianType : kMeanType
    const activeUnivariateMeasures = adornmentsStore?.activeUnivariateMeasures
    const isBlockingOtherMeasure = activeUnivariateMeasures?.find((measure: IUnivariateMeasureAdornmentModel) => {
        if (measure.type !== otherMeasureType) return false
        const otherMeasureValue = measure.measureValue(attrId, this.cellKey, dataConfig)
        return otherMeasureValue && Math.abs(scale(otherMeasureValue) - scale(thisMeasureValue)) < 2
      }
    )
    return isBlockingOtherMeasure
  }

  getProportions(event: { x: number, y: number }, labelId: string) {
    const label = select(`#${labelId}`)
    const labelElt = label.node() as Element
    const parentElt = labelElt.closest(".measure-labels")
    if (!labelElt || !parentElt) return
    const labelBounds = labelElt.getBoundingClientRect()
    const labelWidth = labelBounds.width
    const labelHeight = labelBounds.height
    const parentBounds = parentElt.getBoundingClientRect()
    const parentWidth = parentBounds.width
    const parentHeight = parentBounds.height
    const left = event.x - labelWidth / 2
    const top = event.y - labelHeight / 2
    return { x: left / parentWidth, y: top / parentHeight }
  }

  handleMoveLabel(event: { x: number, y: number, dx: number, dy: number }, labelId: string) {
    if (event.dx !== 0 || event.dy !== 0) {
      const proportions = this.getProportions(event, labelId)
      if (proportions) {
        const label = select(`#${labelId}`)
        label.style('left', `${100 * proportions.x}%`).style('top', `${100 * proportions.y}%`)
      }
    }
  }

  handleEndMoveLabel(event: Point, labelId: string) {
    const {measures} = this.model
    const proportions = this.getProportions(event, labelId)
    if (!proportions) return
    const measure = measures.get(this.instanceKey)
    measure?.setLabelCoords({ x: proportions.x, y: proportions.y })
  }

  computeTextContentForStdErr(dataConfiguration: IGraphDataConfigurationModel, isVertical: boolean, stdErr: number,
                                       numStErrs: number, inHTML: boolean) {
    const primaryAttributeID = dataConfiguration?.primaryAttributeID
    const primaryAttribute = primaryAttributeID
      ? dataConfiguration?.dataset?.attrFromID(primaryAttributeID) : undefined
    const primaryAttributeUnits = primaryAttribute?.units
    const stdErrorString = this.formatValueForScale(isVertical, numStErrs * stdErr)
    const numStdErrsString = numStErrs === 1 ? '' : parseFloat(numStErrs.toFixed(2)).toString()
    const substitutionVars = inHTML ? [`${numStdErrsString}`,
      '<sub style="vertical-align: sub">',
      '</sub>', stdErrorString] : [`${numStdErrsString}`, '', '', stdErrorString]
    const valueString = t(kStandardErrorValueTitleKey, {vars: substitutionVars}) +
      (inHTML ? (primaryAttributeUnits ? ` ${primaryAttributeUnits}` : "") : "")
    const unitsString = `${primaryAttributeUnits ? ` ${primaryAttributeUnits}` : ""}`
    const valueContent = inHTML ? `<p style = "color:${kErrorBarStrokeColor};">${valueString}</p>` : valueString
    return `${valueContent}${inHTML ? '' : unitsString}`
  }

}
