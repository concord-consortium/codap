import { BaseType, Selection } from "d3"
import { AxisHelper } from "./axis-helper"
import { MutableRefObject } from "react"
import { kAxisTickLength } from "../../graph/graphing-types"
import { otherPlace } from "../axis-types"
import { axisPlaceToAttrRole, transitionDuration } from "../../data-display/data-display-types"
import {
  collisionExists, DragInfo,
  getCategoricalLabelPlacement,
  getCoordFunctions,
  IGetCoordFunctionsProps
} from "../axis-utils"

export interface CatObject {
  cat: string
  index: number
}

export type ICategoricalAxisHelperProps = {
  subAxisSelectionRef: MutableRefObject<Selection<SVGGElement, any, any, any> | undefined>
  categoriesSelectionRef: MutableRefObject<Selection<SVGGElement | BaseType, CatObject, SVGGElement, any> | undefined>
  swapInProgress: MutableRefObject<boolean>
  centerCategoryLabels: boolean
  dragInfo: MutableRefObject<DragInfo>
}

export class CategoricalAxisHelper extends AxisHelper {
  subAxisSelectionRef: MutableRefObject<Selection<SVGGElement, any, any, any> | undefined>
  categoriesSelectionRef: MutableRefObject<Selection<SVGGElement | BaseType, CatObject, SVGGElement, any> | undefined>
  swapInProgress: MutableRefObject<boolean>
  centerCategoryLabels: boolean
  dragInfo: MutableRefObject<DragInfo>

  constructor(...args: [...ConstructorParameters<typeof AxisHelper>, ICategoricalAxisHelperProps]) {
    const categoricalAxisProps = args[args.length - 1] as ICategoricalAxisHelperProps,
      axisHelperProps = args.slice(0, args.length - 1) as ConstructorParameters<typeof AxisHelper>
    super(...axisHelperProps)
    this.subAxisSelectionRef = categoricalAxisProps.subAxisSelectionRef
    this.categoriesSelectionRef = categoricalAxisProps.categoriesSelectionRef
    this.swapInProgress = categoricalAxisProps.swapInProgress
    this.centerCategoryLabels = categoricalAxisProps.centerCategoryLabels
    this.dragInfo = categoricalAxisProps.dragInfo
  }

  get dataConfig() {
    return this.displayModel.dataConfiguration
  }

  render() {
    if (!(this.subAxisSelectionRef.current && this.categoriesSelectionRef.current)) return

    const {isVertical, centerCategoryLabels, dragInfo} = this,
      categorySet = this.multiScale?.categorySet,
      dividerLength = this.layout.getAxisLength(otherPlace(this.axisPlace)) ?? 0,
      isRightCat = this.axisPlace === 'rightCat',
      isTop = this.axisPlace === 'top',
      role = axisPlaceToAttrRole[this.axisPlace],
      categories: string[] = this.dataConfig?.categoryArrayForAttrRole(role) ?? [],
      numCategories = categories.length,
      hasCategories = !(categories.length === 1 && categories[0] === "__main__"),
      bandWidth = this.subAxisLength / numCategories,
      collision = collisionExists({bandWidth, categories, centerCategoryLabels}),
      {rotation, textAnchor} = getCategoricalLabelPlacement(this.axisPlace, this.centerCategoryLabels,
        collision),
      duration = (this.isAnimating() && !this.swapInProgress.current &&
        dragInfo.current.indexOfCategory === -1) ? transitionDuration : 0

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
        numCategories, centerCategoryLabels, collision, axisIsVertical: isVertical, rangeMin, rangeMax,
        subAxisLength, isRightCat, isTop, dragInfo
      },
      fns = getCoordFunctions(props)

    hasCategories && this.categoriesSelectionRef.current
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
            .attr('transform', `${rotation}`)
            .attr('text-anchor', textAnchor)
            .attr('transform-origin', (d, i) => {
              return `${fns.getLabelX(i)} ${fns.getLabelY(i)}`
            })
            .transition().duration(duration)
            .attr('class', 'category-label')
            .attr('x', (d, i) => fns.getLabelX(i))
            .attr('y', (d, i) => fns.getLabelY(i))
            .text((catObject: CatObject) => String(catObject.cat))
          return update
        }
      )
  }
}
