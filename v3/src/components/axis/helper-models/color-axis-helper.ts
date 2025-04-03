import { BaseType, Selection } from "d3"
import { AxisHelper, IAxisHelperArgs } from "./axis-helper"
import { MutableRefObject } from "react"
import { kAxisTickLength, kDefaultColorSwatchHeight } from "../axis-constants"
import { otherPlace } from "../axis-types"
import { kMain, transitionDuration } from "../../data-display/data-display-types"
import {
  collisionExists, DragInfo,
  getCategoricalLabelPlacement,
  getCoordFunctions,
  IGetCoordFunctionsProps
} from "../axis-utils"

export interface ColorObject {
  color: string
  index: number
}

export interface IColorAxisHelperArgs extends IAxisHelperArgs {
  subAxisSelectionRef: MutableRefObject<Selection<SVGGElement, any, any, any> | undefined>
  colorsSelectionRef: MutableRefObject<Selection<SVGGElement | BaseType, ColorObject, SVGGElement, any> | undefined>
  colorsRef: MutableRefObject<string[]>
  swapInProgress: MutableRefObject<boolean>
  centerNonNumericLabels: boolean
  dragInfo: MutableRefObject<DragInfo>
}

export class ColorAxisHelper extends AxisHelper {
  subAxisSelectionRef: MutableRefObject<Selection<SVGGElement, any, any, any> | undefined>
  colorsSelectionRef: MutableRefObject<Selection<SVGGElement | BaseType, ColorObject, SVGGElement, any> | undefined>
  colorsRef: MutableRefObject<string[]>
  swapInProgress: MutableRefObject<boolean>
  centerNonNumericLabels: boolean
  dragInfo: MutableRefObject<DragInfo>

  constructor(props: IColorAxisHelperArgs) {
    super(props)
    this.subAxisSelectionRef = props.subAxisSelectionRef
    this.colorsSelectionRef = props.colorsSelectionRef
    this.colorsRef = props.colorsRef
    this.swapInProgress = props.swapInProgress
    this.centerNonNumericLabels = props.centerNonNumericLabels
    this.dragInfo = props.dragInfo
  }

  render() {
    if (!(this.subAxisSelectionRef.current && this.colorsSelectionRef.current)) return
console.log("coloraxishelper colorsSelectionRef", this.colorsSelectionRef.current)
console.log("coloraxishelper colorsRef", this.colorsRef.current)
    const {isVertical, centerNonNumericLabels, dragInfo} = this,
      categorySet = this.multiScale?.categorySet,
      dividerLength = this.layout.getAxisLength(otherPlace(this.axisPlace)) ?? 0,
      isRightCat = this.axisPlace === 'rightCat',
      isTop = this.axisPlace === 'top',
      categories = this.colorsRef.current,
      numCategories = categories.length,
      hasCategories = !(categories.length === 1 && categories[0] === kMain),
      bandWidth = this.subAxisLength / numCategories,
      collision = collisionExists({bandWidth, categories, centerNonNumericLabels}),
      {rotation} = getCategoricalLabelPlacement(this.axisPlace, this.centerNonNumericLabels,
        collision),
      duration = (this.isAnimating() && !this.swapInProgress.current &&
        dragInfo.current.indexOfCategory === -1) ? transitionDuration : 0

    // console.log("categorySet", categorySet)
    // console.log("categories", categories)
    // Fill out dragInfo for use in drag callbacks
    const dI = dragInfo.current
    dI.categorySet = categorySet
    dI.categories = categories
    dI.bandwidth = bandWidth
    dI.axisOrientation = isVertical ? 'vertical' : 'horizontal'
    dI.labelOrientation = isVertical ? (collision ? 'horizontal' : 'vertical')
      : (collision ? 'vertical' : 'horizontal')

    const sAS = this.subAxisSelectionRef.current,
      { rangeMin, rangeMax, subAxisLength } = this

    sAS.attr("transform", this.initialTransform)
      .select('line')
      .attr('x1', isVertical ? 0 : rangeMin)
      .attr('x2', isVertical ? 0 : rangeMax)
      .attr('y1', isVertical ? rangeMin : 0)
      .attr('y2', isVertical ? rangeMax : 0)

    const props: IGetCoordFunctionsProps = {
        numCategories, centerNonNumericLabels, collision, axisIsVertical: isVertical, rangeMin, rangeMax,
        subAxisLength, isRightCat, isTop, dragInfo
      },
      fns = getCoordFunctions(props)

    hasCategories && this.colorsSelectionRef.current
      .join(
        enter => enter,
        update => {
          update.select('.tick')
            .attr('x1', (d, i) => fns.getTickX(i))
            .attr('x2', (d, i) => isVertical
              ? (isRightCat ? 1 : -1) * kAxisTickLength : fns.getTickX(i))
            .attr('y1', (d, i) => fns.getTickY(i))
            .attr('y2', (d, i) => isVertical
              ? fns.getTickY(i) : (isTop ? -1 : 1) * kAxisTickLength)
          // divider between groups
          update.select('.divider')
            .attr('x1', (d, i) => fns.getDividerX(i))
            .attr('x2', (d, i) => isVertical
              ? (isRightCat ? -1 : 1) * dividerLength : fns.getDividerX(i))
            .attr('y1', (d, i) => fns.getDividerY(i))
            .attr('y2', (d, i) => isVertical
              ? fns.getDividerY(i) : (isTop ? 1 : -1) * dividerLength)
          // labels
          update.select('.category-label')
            .remove()
          update.select('.color-label')
            .attr('class', 'color-label')
            .attr('x', (d, i) => fns.getLabelX(i) - ((bandWidth * 2 / 3) / 2))
            .attr('y', (d, i) => Math.max(6.5, fns.getLabelY(i) - (kDefaultColorSwatchHeight / (isVertical ? 2 : 1))))
            .style("fill", (d: ColorObject, i) => categories[i])
            .style("width", (bandWidth * 2)/3)
            .style("height", `${kDefaultColorSwatchHeight}px`)
            .attr('transform', `${rotation}`)
            .attr('transform-origin', (d, i) => {return `${fns.getLabelX(i)} ${fns.getLabelY(i)}`})
            .transition().duration(duration)
            .style('opacity', 0.85)
            .style('stroke', '#315b7d')
          return update
        }
      )
  }
}
