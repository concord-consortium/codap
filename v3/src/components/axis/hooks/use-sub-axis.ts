import {BaseType, drag, format, ScaleLinear, select, Selection} from "d3"
import {autorun, reaction} from "mobx"
import {MutableRefObject, useCallback, useEffect, useMemo, useRef} from "react"
import {AxisBounds, axisPlaceToAxisFn, AxisScaleType, otherPlace} from "../axis-types"
import {useAxisLayoutContext} from "../models/axis-layout-context"
import {IAxisModel, isCategoricalAxisModel, isNumericAxisModel} from "../models/axis-model"
import {ICategorySet} from "../../../models/data/category-set"
import {isVertical} from "../../axis-graph-shared"
import {between} from "../../../utilities/math-utils"
import {kAxisGap, kAxisTickLength, transitionDuration} from "../../graph/graphing-types"
import {collisionExists, computeBestNumberOfTicks, getCategoricalLabelPlacement, getStringBounds} from "../axis-utils"

export interface IUseSubAxis {
  subAxisIndex: number
  axisModel: IAxisModel
  subAxisElt: SVGGElement | null
  enableAnimation: MutableRefObject<boolean>
  showScatterPlotGridLines: boolean
  centerCategoryLabels: boolean
}

interface DragInfo {
  indexOfCategory: number
  catName: string
  currentOffset: number
  currentDragPosition: number
  categorySet?: ICategorySet
  categories: string[]
  bandwidth: number
  axisOrientation: 'horizontal' | 'vertical'
  labelOrientation: 'horizontal' | 'vertical'
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
            .call(axisScale)
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
            textHeight = getStringBounds().height,
            isRightCat = place === 'rightCat',
            isTop = place === 'top',
            categories = Array.from(categorySet?.values ?? []).reverse(),
            categoryData: CatObject[] = categories.map((cat, index) =>
              ({cat, index})),
            numCategories = categories.length,
            bandWidth = subAxisLength / numCategories,
            collision = collisionExists({bandWidth, categories, centerCategoryLabels}),
            {rotation, textAnchor} = getCategoricalLabelPlacement(place, centerCategoryLabels,
              collision, subAxisLength, textHeight)/*,
            duration = enableAnimation.current ? transitionDuration : 0*/

          // Fill out dragInfo for use in drag callbacks
          const dI = dragInfo.current
          dI.categorySet = categorySet
          dI.categories = categories
          dI.bandwidth = bandWidth
          dI.axisOrientation = axisIsVertical ? 'vertical' : 'horizontal'
          dI.labelOrientation = axisIsVertical ? (collision ? 'horizontal' : 'vertical')
            : (collision ? 'vertical' : 'horizontal')

          const sAS = subAxisSelectionRef.current

          sAS.select('line')
            .attr('x1', axisIsVertical ? 0 : rangeMin)
            .attr('x2', axisIsVertical ? 0 : rangeMax)
            .attr('y1', axisIsVertical ? rangeMin : 0)
            .attr('y2', axisIsVertical ? rangeMax : 0)

          const labelTextHeight = getStringBounds('12px sans-serif').height,
            indexOffset = centerCategoryLabels ? 0.5 : (axisIsVertical ? 1 : 0),
            getTickX = (index: number) => axisIsVertical ? 0
              : rangeMin + (index + indexOffset) * subAxisLength / numCategories,
            getTickY = (index: number) => axisIsVertical
              ? rangeMin + (index + indexOffset) * subAxisLength / numCategories : 0,
            getDividerX = (index: number) => axisIsVertical ? 0
              : rangeMin + (index) * subAxisLength / numCategories,
            getDividerY = (index: number) => axisIsVertical
              ? rangeMin + (index + 1) * subAxisLength / numCategories : 0,
            labelXOffset = axisIsVertical ? (collision ? 0 : 0.25 * labelTextHeight)
              : 0,
            getLabelX = (index: number) => getTickX(index) +
              (axisIsVertical ? (isRightCat ? 1 : -1) * (kAxisTickLength + kAxisGap + labelXOffset)
                : (collision ? 0.25 * labelTextHeight : 0)),
            labelYOffset = axisIsVertical ? 0 : (collision ? 0 : (isTop ? -0.15 : 0.75) * labelTextHeight),
            getLabelY = (index: number) => getTickY(index) + (axisIsVertical ? (collision ? 0.25 * labelTextHeight : 0)
              : (isTop ? -1 : 1) * (kAxisTickLength + kAxisGap) + labelYOffset),
            dragXOffset = (index: number) => (index === dI.indexOfCategory && dI.axisOrientation === 'horizontal')
              ? dI.currentOffset : 0,
            dragYOffset = (index: number) => (index === dI.indexOfCategory && dI.axisOrientation === 'vertical')
              ? dI.currentOffset : 0

          categoriesSelectionRef.current
            .join(
              enter => enter,
              update => {
                update.select('.tick')
                  .attr('x1', (d, index) => getTickX(index) + dragXOffset(index))
                  .attr('x2', (d, index) => axisIsVertical
                    ? (isRightCat ? 1 : -1) * kAxisTickLength : getTickX(index))
                  .attr('y1', (d, index) => getTickY(index) + dragYOffset(index))
                  .attr('y2', (d, index) => axisIsVertical
                    ? getTickY(index) : (isTop ? -1 : 1) * kAxisTickLength)
                // divider between groups
                update.select('.divider')
                  .attr('x1', (d, index) => getDividerX(index) + dragXOffset(index))
                  .attr('x2', (d, index) => axisIsVertical
                    ? (isRightCat ? -1 : 1) * dividerLength : getDividerX(index))
                  .attr('y1', (d, index) => getDividerY(index) + dragYOffset(index))
                  .attr('y2', (d, index) => axisIsVertical
                    ? getDividerY(index) : (isTop ? 1 : -1) * dividerLength)
                // labels
                update.select('.category-label')
                  .attr('class', 'category-label')
                  .attr('x', (d, index) => getLabelX(index) + dragXOffset(index))
                  .attr('y', (d, index) => getLabelY(index) + dragXOffset(index))
                  .attr('transform-origin', (d, index) => `${getLabelX(index)} ${getLabelY(index)}`)
                  .attr('transform', `${rotation}`)
                  .attr('text-anchor', textAnchor)
                  .text((catObject:CatObject) => String(catObject.cat))
                return update
              }
            )
        }

      // When switching from one axis type to another, e.g. a categorical axis to an
      // empty axis, d3 will use existing ticks (in DOM) to initialize the new scale.
      // To avoid that, we manually remove the ticks before initializing the axis.
      // select(subAxisElt).selectAll('*').remove()

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

    onDragStart = useCallback((event: { x: number; y: number }, catObject: any) => {
      const dI = dragInfo.current
      dI.indexOfCategory = catObject.index
      dI.catName = catObject.cat
      const eventCoord = dI.axisOrientation === 'horizontal' ? event.x : event.y
      dI.currentOffset = 0
      dI.currentDragPosition = eventCoord
    }, []),

    onDrag = useCallback((event: { dx: number; dy: number }) => {
      if (event.dx !== 0 || event.dy !== 0) {
        console.log('onDrag')
        const dI = dragInfo.current,
          increment = dI.axisOrientation === 'horizontal' ? event.dx : event.dy,
          newDragPosition = dI.currentDragPosition + increment,
          newCatIndex = Math.floor(newDragPosition / dI.bandwidth)
        dI.currentOffset += increment
        if (newCatIndex >= 0 && newCatIndex !== dI.indexOfCategory && newCatIndex <= dI.categories.length) {
          // swap the two categories
          // duration.current = transitionDuration / 2
          const newCatName = newCatIndex < dI.categories.length ? dI.categories[newCatIndex] : '',
            catToMove = dI.indexOfCategory < newCatIndex ? dI.catName : newCatName,
            catToMoveBefore = dI.indexOfCategory < newCatIndex ? newCatName : dI.catName
          dI.categorySet?.move(catToMove, catToMoveBefore)
          dI.indexOfCategory = newCatIndex
        } else {
          renderSubAxis()
        }
        dI.currentDragPosition = newDragPosition
      }
    }, [renderSubAxis]),

    onDragEnd = useCallback(() => {
      console.log('onDragEnd')
      const dI = dragInfo.current
      dI.indexOfCategory = -1 // so dragInfo won't influence category placement
    }, []),

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
        axisBounds = layout.getComputedBounds(place) as AxisBounds,
        initialTransform = (place === 'left') ? `translate(${axisBounds.left + axisBounds.width}, ${axisBounds.top})`
          : (place === 'top') ? `translate(${axisBounds.left}, ${axisBounds.top + axisBounds.height})`
            : `translate(${axisBounds.left}, ${axisBounds.top})`,
        categorySet = multiScale?.categorySet,
        categories = Array.from(categorySet?.values ?? []).reverse(),
        categoryData: CatObject[] = categories.map((cat, index) =>
          ({cat, index}))

      subAxisSelectionRef.current = select(subAxisElt)
      const sAS = subAxisSelectionRef.current

      sAS.selectAll('*').remove()  // start over
      sAS.attr("transform", initialTransform)
        .attr('class', 'axis')
        .append('line')
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
    renderSubAxis()
  }, [renderSubAxis, multiScaleChangeCount])

  useEffect(function setup() {
    if (subAxisElt && isCategorical) {
      setupCategories()
      renderSubAxis()
    }
  }, [subAxisElt, isCategorical, setupCategories, renderSubAxis])

}
