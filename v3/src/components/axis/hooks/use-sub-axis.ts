import {drag, format, ScaleLinear, select} from "d3"
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
    })

  const onDragStart = useCallback((event: { x: number; y: number }, catObject: any) => {
      const dI = dragInfo.current
      dI.indexOfCategory = catObject.index
      dI.catName = catObject.cat
      const cellCoord = dI.indexOfCategory * dI.bandwidth,
        eventCoord = dI.axisOrientation === 'horizontal' ? event.x : event.y
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
          refreshSubAxis()
        }
        dI.currentDragPosition = newDragPosition
      }
    }, []),

    onDragEnd = useCallback(() => {
      console.log('onDragEnd')
      const dI = dragInfo.current
      dI.indexOfCategory = -1 // so dragInfo won't influence category placement
    }, []),
    dragBehavior = useMemo(() => drag<SVGTextElement, number>()
      .on("start", onDragStart)
      .on("drag", onDrag)
      .on("end", onDragEnd), [onDragStart, onDrag, onDragEnd])

  const refreshSubAxis = useCallback(() => {
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

    const drawAxis = () => {
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

      drawScatterPlotGridLines = () => {
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

      drawCategoricalSubAxis = () => {

        const
          categorySet = multiScale?.categorySet,
          dividerLength = layout.getAxisLength(otherPlace(place)) ?? 0,
          textHeight = getStringBounds().height,
          isRightCat = place === 'rightCat',
          isTop = place === 'top',
          categories = Array.from(categorySet?.values ?? []).reverse(),
          categoryData = categories.map((cat, index) => ({cat, index})),
          numCategories = categories.length,
          bandWidth = subAxisLength / numCategories,
          collision = collisionExists({bandWidth, categories, centerCategoryLabels}),
          {rotation, textAnchor} = getCategoricalLabelPlacement(place, centerCategoryLabels,
            collision, subAxisLength, textHeight)/*,
            duration = enableAnimation.current ? transitionDuration : 0*/

        if (!subAxisElt) return

        // Fill out dragInfo for use in drag callbacks
        const dI = dragInfo.current
        dI.categorySet = categorySet
        dI.categories = categories
        dI.bandwidth = bandWidth
        dI.axisOrientation = axisIsVertical ? 'vertical' : 'horizontal'
        dI.labelOrientation = axisIsVertical ? (collision ? 'horizontal' : 'vertical')
          : (collision ? 'vertical' : 'horizontal')

        select(subAxisElt).selectAll('*').remove()  // start over
        const subAxisSelection = select(subAxisElt)
          .attr("transform", initialTransform)
          .attr('class', 'axis')

        subAxisSelection
          .append('line')
          .attr('x1', axisIsVertical ? 0 : rangeMin)
          .attr('x2', axisIsVertical ? 0 : rangeMax)
          .attr('y1', axisIsVertical ? rangeMin : 0)
          .attr('y2', axisIsVertical ? rangeMax : 0)

        const categoriesSelection = subAxisSelection
          .selectAll<SVGGElement, number>('g')
          .data(categoryData)
          .join(
            enter => enter
              .append('g')
              .attr('data-testid', 'category-on-axis')
            // .call(dragBehavior)
          )
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

        categoriesSelection.each(function (catObject, index) {
          const sel = select<SVGGElement, number>(this),
            size = sel.selectAll<SVGLineElement, number>('line').size()
          if (size === 0) {
            // ticks
            sel.append('line')
              .attr('x1', getTickX(index) + dragXOffset(index))
              .attr('x2', axisIsVertical ? (isRightCat ? 1 : -1) * kAxisTickLength : getTickX(index))
              .attr('y1', getTickY(index) + dragYOffset(index))
              .attr('y2', axisIsVertical ? getTickY(index) : (isTop ? -1 : 1) * kAxisTickLength)
            // divider between groups
            sel.append('line')
              .attr('x1', getDividerX(index) + dragXOffset(index))
              .attr('x2', axisIsVertical ? (isRightCat ? -1 : 1) * dividerLength : getDividerX(index))
              .attr('y1', getDividerY(index) + dragYOffset(index))
              .attr('y2', axisIsVertical ? getDividerY(index) : (isTop ? 1 : -1) * dividerLength)
            // labels
            sel.append('text')
              .attr('class', 'category-label')
              .attr('x', getLabelX(index) + dragXOffset(index))
              .attr('y', getLabelY(index) + dragXOffset(index))
              .attr('transform-origin', `${getLabelX(index)} ${getLabelY(index)}`)
              .attr('transform', `${rotation}`)
              .attr('text-anchor', textAnchor)
              .text(String(catObject.cat))
              .call(dragBehavior)
          }
        })
      }

    // When switching from one axis type to another, e.g. a categorical axis to an
    // empty axis, d3 will use existing ticks (in DOM) to initialize the new scale.
    // To avoid that, we manually remove the ticks before initializing the axis.
    select(subAxisElt).selectAll('*').remove()

    d3Scale.range(axisIsVertical ? [rangeMax, rangeMin] : [rangeMin, rangeMax])
    switch (type) {
      case 'numeric':
      case 'empty':
        drawAxis()
        showScatterPlotGridLines && drawScatterPlotGridLines()
        break
      case 'categorical':
        drawCategoricalSubAxis()
        break
    }
  }, [subAxisElt, layout, showScatterPlotGridLines, enableAnimation, centerCategoryLabels, axisModel,
    subAxisIndex, dragBehavior])

  // update d3 scale and axis when scale type changes
  useEffect(() => {
    const disposer = reaction(
      () => {
        const {place: aPlace, scale: scaleType} = axisModel
        return {place: aPlace, scaleType}
      },
      ({place: aPlace, scaleType}) => {
        layout.getAxisMultiScale(aPlace)?.setScaleType(scaleType)
        refreshSubAxis()
      }
    )
    return () => disposer()
  }, [isNumeric, axisModel, layout, refreshSubAxis])

  // Install reaction to bring about rerender when layout's computedBounds changes
  useEffect(() => {
    const disposer = reaction(
      () => layout.getComputedBounds(axisModel.place),
      () => refreshSubAxis()
    )
    return () => disposer()
  }, [layout, refreshSubAxis, axisModel.place])

  // update d3 scale and axis when axis domain changes
  useEffect(function installDomainSync() {
    if (isNumeric) {
      const disposer = autorun(() => {
        if (axisModel.domain) {
          const {domain} = axisModel
          layout.getAxisMultiScale(axisModel.place)?.setNumericDomain(domain)
          refreshSubAxis()
        }
      })
      return () => disposer()
    }
  }, [isNumeric, axisModel, refreshSubAxis, layout])

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
          refreshSubAxis()
          savedCategorySetValuesRef.current = values
        }
      })
      return () => disposer()
    }
  }, [axisModel, refreshSubAxis, layout, isCategorical])

  // update d3 scale and axis when layout/range changes
  useEffect(() => {
    const disposer = reaction(
      () => {
        return layout.getAxisLength(axisModel.place)
      },
      () => {
        refreshSubAxis()
      }
    )
    return () => disposer()
  }, [axisModel, layout, refreshSubAxis])

  // update on multiScaleChangeCount change
  useEffect(() => {
    refreshSubAxis()
  }, [refreshSubAxis, multiScaleChangeCount])

}
