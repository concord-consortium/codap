import {BaseType, drag, format, ScaleLinear, select, Selection} from "d3"
import {reaction} from "mobx"
import {useCallback, useEffect, useMemo, useRef} from "react"
import {transitionDuration} from "../../data-display/data-display-types"
import {useDataDisplayAnimation} from "../../data-display/hooks/use-data-display-animation"
import {AxisBounds, AxisPlace, axisPlaceToAxisFn, AxisScaleType, otherPlace} from "../axis-types"
import {useAxisLayoutContext} from "../models/axis-layout-context"
import {isCategoricalAxisModel, isNumericAxisModel} from "../models/axis-model"
import {isVertical} from "../../axis-graph-shared"
import {between} from "../../../utilities/math-utils"
import {mstAutorun} from "../../../utilities/mst-autorun"
import {isAliveSafe} from "../../../utilities/mst-utils"
import {kAxisTickLength} from "../../graph/graphing-types"
import {DragInfo, collisionExists, computeBestNumberOfTicks, getCategoricalLabelPlacement,
        getCoordFunctions, IGetCoordFunctionsProps} from "../axis-utils"
import { useAxisProviderContext } from "./use-axis-provider-context"
import { useDataDisplayModelContext } from "../../data-display/hooks/use-data-display-model"

export interface IUseSubAxis {
  subAxisIndex: number
  axisPlace: AxisPlace
  subAxisElt: SVGGElement | null
  showScatterPlotGridLines: boolean
  centerCategoryLabels: boolean
}

interface CatObject {
  cat: string
  index: number
}

export const useSubAxis = ({
                             subAxisIndex, axisPlace, subAxisElt, showScatterPlotGridLines, centerCategoryLabels
                           }: IUseSubAxis) => {
  const layout = useAxisLayoutContext(),
    displayModel = useDataDisplayModelContext(),
    {isAnimating, stopAnimation} = useDataDisplayAnimation(),
    axisProvider = useAxisProviderContext(),
    axisModel = axisProvider.getAxis?.(axisPlace),
    isNumeric = isNumericAxisModel(axisModel),
    isCategorical = isCategoricalAxisModel(axisModel),
    multiScaleChangeCount = layout.getAxisMultiScale(axisModel?.place ?? 'bottom')?.changeCount ?? 0,
    savedCategorySetValuesRef = useRef<string[]>([]),
    dragInfo = useRef<DragInfo>({
      indexOfCategory: -1,
      catName: '',
      initialOffset: 0,
      currentOffset: 0,
      currentDragPosition: 0,
      categories: [],
      bandwidth: 0,
      axisOrientation: 'horizontal',
      labelOrientation: 'horizontal'
    }),
    swapInProgress = useRef(false),
    subAxisSelectionRef = useRef<Selection<SVGGElement, any, any, any>>(),
    categoriesSelectionRef = useRef<Selection<SVGGElement | BaseType, CatObject, SVGGElement, any>>(),

    renderSubAxis = useCallback(() => {
      const _axisModel = axisProvider.getAxis?.(axisPlace)
      if (!isAliveSafe(_axisModel)) {
        console.warn("useSubAxis.renderSubAxis skipping rendering of defunct axis model:", axisPlace)
        return
      }
      const
        multiScale = layout.getAxisMultiScale(axisPlace)
      if (!multiScale) return // no scale, no axis (But this shouldn't happen)

      const subAxisLength = multiScale?.cellLength ?? 0,
        rangeMin = subAxisIndex * subAxisLength,
        rangeMax = rangeMin + subAxisLength,
        axisIsVertical = isVertical(axisPlace),
        axis = axisPlaceToAxisFn(axisPlace),
        type = _axisModel?.type,
        axisBounds = layout.getComputedBounds(axisPlace) as AxisBounds,
        d3Scale: AxisScaleType = multiScale.scale.copy()
          .range(axisIsVertical ? [rangeMax, rangeMin] : [rangeMin, rangeMax]) as AxisScaleType,
        initialTransform = (axisPlace === 'left')
          ? `translate(${axisBounds.left + axisBounds.width}, ${axisBounds.top})`
          : (axisPlace === 'top')
            ? `translate(${axisBounds.left}, ${axisBounds.top + axisBounds.height})`
            : `translate(${axisBounds.left}, ${axisBounds.top})`

      const renderEmptyAxis = () => {
          select(subAxisElt).selectAll('*').remove()
          select(subAxisElt)
            .attr("transform", initialTransform)
            .append('line')
            .attr('x1', 0)
            .attr('x2', axisIsVertical ? 0 : subAxisLength)
            .attr('y1', 0)
            .attr('y2', axisIsVertical ? subAxisLength : 0)
            .style("stroke", "lightgrey")
            .style("stroke-opacity", "0.7")
        },
        renderNumericAxis = () => {
          if (!axisModel) return
          select(subAxisElt).selectAll('*').remove()
          const numericScale = d3Scale as unknown as ScaleLinear<number, number>
          const axisScale = axis(numericScale).tickSizeOuter(0).tickFormat(format('.9'))
          const duration = isAnimating() ? transitionDuration : 0
          if (!axisIsVertical && displayModel.hasDraggableNumericAxis(axisModel)) {
            axisScale.tickValues(numericScale.ticks(computeBestNumberOfTicks(numericScale)))
          } else if (!displayModel.hasDraggableNumericAxis(axisModel)) {
            const { tickValues, tickLabels } = displayModel.nonDraggableAxisTicks()
            axisScale.tickValues(tickValues)
            axisScale.tickFormat((d, i) => {
              return tickLabels[i]
            })
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
            const tickLength = layout.getAxisLength(otherPlace(axisPlace)) ?? 0
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
            dividerLength = layout.getAxisLength(otherPlace(axisPlace)) ?? 0,
            isRightCat = axisPlace === 'rightCat',
            isTop = axisPlace === 'top',
            categories = Array.from(categorySet?.values ?? []),
            numCategories = categories.length,
            bandWidth = subAxisLength / numCategories,
            collision = collisionExists({bandWidth, categories, centerCategoryLabels}),
            {rotation, textAnchor} = getCategoricalLabelPlacement(axisPlace, centerCategoryLabels,
              collision),
            duration = (isAnimating() && !swapInProgress.current &&
              dragInfo.current.indexOfCategory === -1) ? transitionDuration : 0

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

          const props: IGetCoordFunctionsProps = {
              numCategories, centerCategoryLabels, collision, axisIsVertical, rangeMin, rangeMax,
              subAxisLength, isRightCat, isTop, dragInfo
            },
            fns = getCoordFunctions(props)

          categoriesSelectionRef.current
            .join(
              enter => enter,
              update => {
                update.select('.tick')
                  .attr('x1', (d, i) => fns.getTickX(i))
                  .attr('x2', (d, i) => axisIsVertical
                    ? (isRightCat ? 1 : -1) * kAxisTickLength : fns.getTickX(i))
                  .attr('y1', (d, i) => fns.getTickY(i))
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

      d3Scale.range(axisIsVertical ? [rangeMax, rangeMin] : [rangeMin, rangeMax])
      switch (type) {
        case 'empty':
          renderEmptyAxis()
          break
        case 'numeric':
          renderNumericAxis()
          showScatterPlotGridLines && renderScatterPlotGridLines()
          break
        case 'categorical':
          renderCategoricalSubAxis()
          break
      }
    }, [axisProvider, axisPlace, layout, subAxisIndex, subAxisElt, axisModel, isAnimating, displayModel,
        centerCategoryLabels, showScatterPlotGridLines]),

    onDragStart = useCallback((event: any) => {
      const dI = dragInfo.current
      dI.currentDragPosition = dI.axisOrientation === 'horizontal' ? event.x : event.y
      dI.indexOfCategory = dI.axisOrientation === 'horizontal'
        ? Math.floor(dI.currentDragPosition / dI.bandwidth)
        : dI.categories.length - 1 - Math.floor(dI.currentDragPosition / dI.bandwidth)
      dI.catName = dI.categories[dI.indexOfCategory]
      dI.currentOffset = 0
      dI.initialOffset = dI.currentDragPosition - (dI.indexOfCategory + 0.5) * dI.bandwidth
    }, []),

    /**
     * Note: The event actually includes 'dx' and 'dy' properties, but they are not
     * used here because there was an episode during which they didn't work reliably
     * and the current less straightforward approach was adopted. It may be worth
     * revisiting this at some point.
     */
    onDrag = useCallback((event: any) => {
      const dI = dragInfo.current,
        delta = dI.axisOrientation === 'horizontal' ? event.dx : event.dy
      if (delta !== 0) {
        const
          numCategories = dI.categories.length,
          newDragPosition = dI.currentDragPosition + delta,
          cellIndex = Math.floor(newDragPosition / dI.bandwidth),
          newCatIndex = dI.axisOrientation === 'horizontal' ? cellIndex
            : dI.categories.length - cellIndex - 1
        dI.currentOffset += delta
        if (newCatIndex >= 0 && newCatIndex !== dI.indexOfCategory && newCatIndex < dI.categories.length) {
          dI.currentOffset = newDragPosition - (cellIndex + 0.5) * dI.bandwidth - dI.initialOffset

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
      stopAnimation() // disable animation for final placement
      renderSubAxis()
    }, [stopAnimation, renderSubAxis]),

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
        multiScale = layout.getAxisMultiScale(axisPlace),
        categorySet = multiScale?.categorySet,
        categories = Array.from(categorySet?.values ?? []),
        categoryData: CatObject[] = categories.map((cat, index) =>
          ({cat, index: isVertical(axisPlace) ? categories.length - index - 1 : index}))

      subAxisSelectionRef.current = select(subAxisElt)
      const sAS = subAxisSelectionRef.current

      select(subAxisElt).selectAll('*').remove()  // start over

      sAS.attr('class', 'axis').append('line')
      categoriesSelectionRef.current = sAS.selectAll('g')
        .data(categoryData)
        .join(
          (enter) => {
            return enter
              .append('g')
              .attr('class', 'category-group')
              .attr('data-testid', 'category-on-axis')
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              .call(dragBehavior)
          }
        )
      categoriesSelectionRef.current.each(function () {
        const catGroup = select(this)
        // ticks
        catGroup.append('line')
          .attr('class', 'tick')
          .attr('data-testid', 'tick')
        // divider between groups
        catGroup.append('line')
          .attr('class', 'divider')
          .attr('data-testid', 'divider')
        // labels
        catGroup.append('text')
          .attr('class', 'category-label')
          .attr('data-testid', 'category-label')
          .attr('x', 0)
          .attr('y', 0)
      })

    }, [axisPlace, dragBehavior, layout, subAxisElt])

  // update d3 scale and axis when scale type changes
  useEffect(() => {
    const disposer = reaction(
      () => axisModel?.scale,
      (scaleType) => {
        scaleType && layout.getAxisMultiScale(axisPlace)?.setScaleType(scaleType)
        renderSubAxis()
      }, {name: "useSubAxis [scaleType]"}
    )
    return () => disposer()
  }, [axisModel, axisPlace, isNumeric, layout, renderSubAxis])

  // Install reaction to bring about rerender when layout's computedBounds changes
  useEffect(() => {
    const disposer = reaction(
      () => layout.getComputedBounds(axisPlace),
      () => renderSubAxis(),
      {name: "useSubAxis [layout.getComputedBounds()"}
    )
    return () => disposer()
  }, [axisPlace, layout, renderSubAxis])

  // update d3 scale and axis when axis domain changes
  useEffect(function installDomainSync() {
    return mstAutorun(() => {
      const _axisModel = axisProvider?.getAxis?.(axisPlace)
      if (isAliveSafe(_axisModel)) {
        if (isNumericAxisModel(_axisModel)) {
          const { domain } = _axisModel || {}
          layout.getAxisMultiScale(axisPlace)?.setNumericDomain(domain)
          renderSubAxis()
        }
      }
      else if (_axisModel) {
        console.warn("useSubAxis.installDomainSync skipping sync of defunct axis model")
      }
    }, { name: "useSubAxis.installDomainSync" }, axisProvider)
  }, [axisPlace, axisProvider, displayModel, layout, renderSubAxis])

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
          swapInProgress.current = true
          renderSubAxis()
          savedCategorySetValuesRef.current = values
          swapInProgress.current = false
        }
      }, {name: "useSubAxis [categories]"})
      return () => disposer()
    }
  }, [axisModel, renderSubAxis, layout, isCategorical, setupCategories])

  // update d3 scale and axis when layout/range changes
  useEffect(() => {
    const disposer = reaction(
      () => {
        return layout.getAxisLength(axisPlace)
      },
      () => {
        renderSubAxis()
      }, {name: "useSubAxis [axisLength]"}
    )
    return () => disposer()
  }, [axisPlace, layout, renderSubAxis])

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
