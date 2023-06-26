import {BaseType, drag, format, ScaleLinear, select, Selection} from "d3"
import {autorun, reaction} from "mobx"
import {MutableRefObject, useCallback, useEffect, useMemo, useRef} from "react"
import {AxisBounds, axisPlaceToAxisFn, AxisScaleType, otherPlace} from "../axis-types"
import {useAxisLayoutContext} from "../models/axis-layout-context"
import {IAxisModel, isCategoricalAxisModel, isNumericAxisModel} from "../models/axis-model"
import {isVertical} from "../../axis-graph-shared"
import {between} from "../../../utilities/math-utils"
import {kAxisTickLength, transitionDuration} from "../../graph/graphing-types"
import {DragInfo, collisionExists, computeBestNumberOfTicks, getCategoricalLabelPlacement,
  getCoordFunctions, IGetCoordFunctionsProps} from "../axis-utils"

export interface IUseSubAxis {
  subAxisIndex: number
  axisModel: IAxisModel
  subAxisElt: SVGGElement | null
  enableAnimation: MutableRefObject<boolean>
  showScatterPlotGridLines: boolean
  centerCategoryLabels: boolean
}

interface CatObject {
  cat: string
  index: number
}

export const useSubAxis = ({
                             subAxisIndex, axisModel, subAxisElt, showScatterPlotGridLines, centerCategoryLabels,
                             enableAnimation
                           }: IUseSubAxis) => {
  const layout = useAxisLayoutContext(),
    isNumeric = isNumericAxisModel(axisModel),
    isCategorical = isCategoricalAxisModel(axisModel),
    multiScaleChangeCount = layout.getAxisMultiScale(axisModel?.place ?? 'bottom')?.changeCount ?? 0,
    savedCategorySetValuesRef = useRef<string[]>([]),
    dragInfo = useRef<DragInfo>({
      indexOfCategory: -1,
      catName: '',
      currentOffset: 0,
      currentDragPosition: 0,
      categories: [],
      bandwidth: 0,
      axisOrientation: 'horizontal',
      labelOrientation: 'horizontal'
    }),
    subAxisSelectionRef = useRef<Selection<SVGGElement, any, any, any>>(),
    categoriesSelectionRef = useRef<Selection<SVGGElement | BaseType, CatObject, SVGGElement, any>>(),

    renderSubAxis = useCallback(() => {
      const
        place = axisModel.place,
        multiScale = layout.getAxisMultiScale(place)
      if (!multiScale) return // no scale, no axis (But this shouldn't happen)

      const subAxisLength = multiScale?.cellLength ?? 0,
        rangeMin = subAxisIndex * subAxisLength,
        rangeMax = rangeMin + subAxisLength,
        axisIsVertical = isVertical(place),
        axis = axisPlaceToAxisFn(place),
        type = axisModel.type,
        axisBounds = layout.getComputedBounds(place) as AxisBounds,
        d3Scale: AxisScaleType = multiScale.scale.copy()
          .range(axisIsVertical ? [rangeMax, rangeMin] : [rangeMin, rangeMax]) as AxisScaleType,
        initialTransform = (place === 'left') ? `translate(${axisBounds.left + axisBounds.width}, ${axisBounds.top})`
          : (place === 'top') ? `translate(${axisBounds.left}, ${axisBounds.top + axisBounds.height})`
            : `translate(${axisBounds.left}, ${axisBounds.top})`

      const renderEmptyOrNumericAxis = () => {
          select(subAxisElt).selectAll('*').remove()
          const numericScale = d3Scale as unknown as ScaleLinear<number, number>,
            axisScale = axis(numericScale).tickSizeOuter(0).tickFormat(format('.9')),
            duration = enableAnimation.current ? transitionDuration : 0
          if (!axisIsVertical && numericScale.ticks) {
            axisScale.tickValues(numericScale.ticks(computeBestNumberOfTicks(numericScale)))
          }
          select(subAxisElt)
            .attr("transform", initialTransform)
            .transition().duration(duration)
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore types are incompatible
            .call(axisScale).selectAll("line,path")
            .style("stroke", "lightgrey")
            .style("stroke-opacity", "0.7")
        },

        renderScatterPlotGridLines = () => {
          if (axis) {
            const numericScale = d3Scale as unknown as ScaleLinear<number, number>
            select(subAxisElt).selectAll('.zero, .grid').remove()
            const tickLength = layout.getAxisLength(otherPlace(place)) ?? 0
            select(subAxisElt).append('g')
              .attr('class', 'grid')
              .call(axis(numericScale).tickSizeInner(-tickLength))
            select(subAxisElt).select('.grid').selectAll('text').remove()
            if (between(0, numericScale.domain()[0], numericScale.domain()[1])) {
              select(subAxisElt).append('g')
                .attr('class', 'zero')
                .call(axis(numericScale).tickSizeInner(-tickLength).tickValues([0]))
              select(subAxisElt).select('.zero').selectAll('text').remove()
            }
          }
        },

        renderCategoricalSubAxis = () => {
          if (!(subAxisSelectionRef.current && categoriesSelectionRef.current)) return

          const categorySet = multiScale?.categorySet,
            dividerLength = layout.getAxisLength(otherPlace(place)) ?? 0,
            isRightCat = place === 'rightCat',
            isTop = place === 'top',
            categories = Array.from(categorySet?.values ?? []),
            numCategories = categories.length,
            bandWidth = subAxisLength / numCategories,
            collision = collisionExists({bandWidth, categories, centerCategoryLabels}),
            {rotation, textAnchor} = getCategoricalLabelPlacement(place, centerCategoryLabels,
              collision),
            duration = (enableAnimation.current && dragInfo.current.indexOfCategory === -1)
              ? transitionDuration : 0

          // Fill out dragInfo for use in drag callbacks
          const dI = dragInfo.current
          dI.categorySet = categorySet
          dI.categories = categories
          dI.bandwidth = bandWidth
          dI.axisOrientation = axisIsVertical ? 'vertical' : 'horizontal'
          dI.labelOrientation = axisIsVertical ? (collision ? 'horizontal' : 'vertical')
            : (collision ? 'vertical' : 'horizontal')

          const sAS = subAxisSelectionRef.current

          sAS.attr("transform", initialTransform)
            .select('line')
            .attr('x1', axisIsVertical ? 0 : rangeMin)
            .attr('x2', axisIsVertical ? 0 : rangeMax)
            .attr('y1', axisIsVertical ? rangeMin : 0)
            .attr('y2', axisIsVertical ? rangeMax : 0)

          const props:IGetCoordFunctionsProps = {
            numCategories, centerCategoryLabels, collision, axisIsVertical, rangeMin, rangeMax,
            subAxisLength, isRightCat, isTop, dragInfo
          },
            fns = getCoordFunctions(props)

          categoriesSelectionRef.current
            .join(
              enter => enter,
              update => {
                update.select('.tick')
                  .attr('x1', (d, i) => fns.getTickX(i) + fns.dragXOffset(i))
                  .attr('x2', (d, i) => axisIsVertical
                    ? (isRightCat ? 1 : -1) * kAxisTickLength : fns.getTickX(i))
                  .attr('y1', (d, i) => fns.getTickY(i) + fns.dragYOffset(i))
                  .attr('y2', (d, i) => axisIsVertical
                    ? fns.getTickY(i) : (isTop ? -1 : 1) * kAxisTickLength)
                // divider between groups
                update.select('.divider')
                  .attr('x1', (d, i) => fns.getDividerX(i))
                  .attr('x2', (d, i) => axisIsVertical
                    ? (isRightCat ? -1 : 1) * dividerLength : fns.getDividerX(i))
                  .attr('y1', (d, i) => fns.getDividerY(i))
                  .attr('y2', (d, i) => axisIsVertical
                    ? fns.getDividerY(i) : (isTop ? 1 : -1) * dividerLength)
                // labels
                update.select('.category-label')
                  .attr('transform', `${rotation}`)
                  .attr('text-anchor', textAnchor)
                  .attr('transform-origin', (d, i) => {
                    return `${fns.getLabelX(i) + fns.dragXOffset(i)} ${fns.getLabelY(i) + fns.dragYOffset(i)}`
                  })
                  .transition().duration(duration)
                  .attr('class', 'category-label')
                  .attr('x', (d, i) => fns.getLabelX(i) + fns.dragXOffset(i))
                  .attr('y', (d, i) => fns.getLabelY(i) + fns.dragYOffset(i))
                  .text((catObject:CatObject) => String(catObject.cat))
                return update
              }
            )
        }

      d3Scale.range(axisIsVertical ? [rangeMax, rangeMin] : [rangeMin, rangeMax])
      switch (type) {
        case 'numeric':
        case 'empty':
          renderEmptyOrNumericAxis()
          showScatterPlotGridLines && renderScatterPlotGridLines()
          break
        case 'categorical':
          renderCategoricalSubAxis()
          break
      }
    }, [subAxisElt, layout, showScatterPlotGridLines, enableAnimation, centerCategoryLabels, axisModel,
      subAxisIndex]),

    onDragStart = useCallback((event: any, catObject: any) => {
      const dI = dragInfo.current
      dI.indexOfCategory = dI.axisOrientation === 'horizontal' ? catObject.index
        : dI.categories.length - catObject.index - 1
      dI.catName = catObject.cat
      dI.currentOffset = 0
      dI.currentDragPosition = dI.axisOrientation === 'horizontal' ? event.x : event.y
    }, []),

    onDrag = useCallback((event:any) => {
      const dI = dragInfo.current,
        delta = dI.axisOrientation === 'horizontal'
          ? event.x - dI.currentDragPosition : event.y - dI.currentDragPosition
      if (delta !== 0) {
        const
          numCategories = dI.categories.length,
          newDragPosition = dI.currentDragPosition + delta,
          cellIndex = Math.floor(newDragPosition / dI.bandwidth),
          newCatIndex = dI.axisOrientation === 'horizontal' ? cellIndex
            : dI.categories.length - cellIndex - 1
        dI.currentOffset += delta
        if (newCatIndex >= 0 && newCatIndex !== dI.indexOfCategory && newCatIndex < dI.categories.length) {
          // swap the two categories
          // Adjust the currentOffset to match the new category position
          dI.currentOffset = newDragPosition - (cellIndex + 0.5) * dI.bandwidth

          // Figure out the label of the category before which the dragged category should be placed
          const moveToGreater = newCatIndex > dI.indexOfCategory,
            catToMoveBefore = moveToGreater
              ? (newCatIndex === numCategories - 1 ? '' : dI.categories[newCatIndex + 1])
              : dI.categories[newCatIndex]
          dI.indexOfCategory = newCatIndex
          dI.categorySet?.move(dI.catName, catToMoveBefore)
        } else {
          renderSubAxis()
        }
        dI.currentDragPosition = newDragPosition
      }
    }, [renderSubAxis]),

    onDragEnd = useCallback(() => {
      const dI = dragInfo.current
      dI.indexOfCategory = -1 // so dragInfo won't influence category placement
      renderSubAxis()
    }, [renderSubAxis]),

    dragBehavior = useMemo(() => drag()
      .on("start", onDragStart)
      .on("drag", onDrag)
      .on("end", onDragEnd), [onDragStart, onDrag, onDragEnd]),

    /**
     * Make sure there is a group element for each category and that the text elements have drag behavior
     */
    setupCategories = useCallback(() => {
      if (!subAxisElt) return
      const
        place = axisModel.place,
        multiScale = layout.getAxisMultiScale(place),
        categorySet = multiScale?.categorySet,
        categories = Array.from(categorySet?.values ?? []),
        categoryData: CatObject[] = categories.map((cat, index) =>
          ({cat, index: isVertical(place) ? categories.length - index - 1 : index}))

      subAxisSelectionRef.current = select(subAxisElt)
      const sAS = subAxisSelectionRef.current
      if (sAS.select('line').size() === 0) {  // only draw the axis line once
        sAS.attr('class', 'axis')
          .append('line')
      }
      categoriesSelectionRef.current = sAS.selectAll('g')
        .data(categoryData)
        .join(
          (enter) => {
            return enter
              .append('g')
              .attr('class', 'category-group')
              .attr('data-testid', 'category-on-axis')
          }
        )
      categoriesSelectionRef.current.each(function () {
        const catGroup = select(this)/*.select('g')*/
        // ticks
        catGroup.append('line').attr('class', 'tick')
        // divider between groups
        catGroup.append('line')
          .attr('class', 'divider')
        // labels
        catGroup.append('text')
          .attr('class', 'category-label')
          .attr('x', 0)
          .attr('y', 0)
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          .call(dragBehavior)
      })

    }, [axisModel.place, dragBehavior, layout, subAxisElt])

  // update d3 scale and axis when scale type changes
  useEffect(() => {
    const disposer = reaction(
      () => {
        const {place: aPlace, scale: scaleType} = axisModel
        return {place: aPlace, scaleType}
      },
      ({place: aPlace, scaleType}) => {
        layout.getAxisMultiScale(aPlace)?.setScaleType(scaleType)
        renderSubAxis()
      }
    )
    return () => disposer()
  }, [isNumeric, axisModel, layout, renderSubAxis])

  // Install reaction to bring about rerender when layout's computedBounds changes
  useEffect(() => {
    const disposer = reaction(
      () => layout.getComputedBounds(axisModel.place),
      () => renderSubAxis()
    )
    return () => disposer()
  }, [layout, renderSubAxis, axisModel.place])

  // update d3 scale and axis when axis domain changes
  useEffect(function installDomainSync() {
    if (isNumeric) {
      const disposer = autorun(() => {
        if (axisModel.domain) {
          const {domain} = axisModel
          layout.getAxisMultiScale(axisModel.place)?.setNumericDomain(domain)
          renderSubAxis()
        }
      })
      return () => disposer()
    }
  }, [isNumeric, axisModel, renderSubAxis, layout])

  // Refresh when category set, if any, changes
  useEffect(function installCategorySetSync() {
    if (isCategorical) {
      const disposer = reaction(() => {
        const multiScale = layout.getAxisMultiScale(axisModel.place),
          categorySet = multiScale?.categorySet,
          categorySetValues = categorySet?.values
        return Array.from(categorySetValues ?? [])
      }, (values) => {
        // todo: The above reaction is detecting changes to the set of values even when they haven't changed. Why?
        if (JSON.stringify(values) !== JSON.stringify(savedCategorySetValuesRef.current)) {
          setupCategories()
          renderSubAxis()
          savedCategorySetValuesRef.current = values
        }
      })
      return () => disposer()
    }
  }, [axisModel, renderSubAxis, layout, isCategorical, setupCategories])

  // update d3 scale and axis when layout/range changes
  useEffect(() => {
    const disposer = reaction(
      () => {
        return layout.getAxisLength(axisModel.place)
      },
      () => {
        renderSubAxis()
      }
    )
    return () => disposer()
  }, [axisModel, layout, renderSubAxis])

  // update on multiScaleChangeCount change
  useEffect(() => {
    isCategorical && setupCategories()
    renderSubAxis()
  }, [renderSubAxis, multiScaleChangeCount, isCategorical, setupCategories])

  // We only need to do this for categorical axes
  useEffect(function setup() {
    if (subAxisElt && isCategorical) {
      setupCategories()
      renderSubAxis()
    }
  }, [subAxisElt, isCategorical, setupCategories, renderSubAxis])

}
