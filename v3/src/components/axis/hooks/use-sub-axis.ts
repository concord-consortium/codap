import {format, ScaleBand, ScaleLinear, select} from "d3"
import {autorun, reaction} from "mobx"
import {MutableRefObject, useCallback, useEffect} from "react"
import {AxisBounds, axisPlaceToAxisFn, AxisScaleType, otherPlace} from "../axis-types"
import {useAxisLayoutContext} from "../models/axis-layout-context"
import {IAxisModel, isCategoricalAxisModel, isNumericAxisModel} from "../models/axis-model"
import {isVertical} from "../../axis-graph-shared"
import {between} from "../../../utilities/math-utils"
import {transitionDuration} from "../../graph/graphing-types"
import {collisionExists, computeBestNumberOfTicks, getCategoricalLabelPlacement, getStringBounds} from "../axis-utils"

export interface IUseSubAxis {
  subAxisIndex: number
  axisModel?: IAxisModel
  subAxisElt: SVGGElement | null
  enableAnimation: MutableRefObject<boolean>
  showScatterPlotGridLines: boolean
  centerCategoryLabels: boolean
}

export const useSubAxis = ({
                             subAxisIndex, axisModel, subAxisElt, showScatterPlotGridLines, centerCategoryLabels,
                             enableAnimation
                           }: IUseSubAxis) => {
  const layout = useAxisLayoutContext(),
    isNumeric = axisModel && isNumericAxisModel(axisModel),
    isCategorical = axisModel && isCategoricalAxisModel(axisModel),
    multiScaleChangeCount = layout.getAxisMultiScale(axisModel?.place ?? 'bottom')?.changeCount ?? 0

  const refreshSubAxis = useCallback(() => {
    const
      place = axisModel?.place ?? 'bottom',
      multiScale = layout.getAxisMultiScale(place)
    if (!multiScale) return // no scale, no axis (But this shouldn't happen)

    const subAxisLength = multiScale?.cellLength ?? 0,
      rangeMin = subAxisIndex * subAxisLength,
      rangeMax = rangeMin + subAxisLength,
      axisIsVertical = isVertical(place),
      axis = axisPlaceToAxisFn(place),
      type = axisModel?.type ?? 'empty',
      axisBounds = layout.getComputedBounds(place) as AxisBounds,
      d3Scale: AxisScaleType = multiScale.scale.copy()
        .range(axisIsVertical ? [rangeMax, rangeMin] : [rangeMin, rangeMax]) as AxisScaleType,
      ordinalScale = isNumeric || axisModel?.type === 'empty' ? null : d3Scale as ScaleBand<string>,
      bandWidth = (ordinalScale?.bandwidth?.()) ?? 0,
      duration = enableAnimation.current ? transitionDuration : 0,
      initialTransform = (place === 'left') ? `translate(${axisBounds.left + axisBounds.width}, ${axisBounds.top})`
        : (place === 'top') ? `translate(${axisBounds.left}, ${axisBounds.top + axisBounds.height})`
          : `translate(${axisBounds.left}, ${axisBounds.top})`

    const drawAxis = () => {
        const numericScale = d3Scale as unknown as ScaleLinear<number, number>,
          axisScale = axis(numericScale).tickSizeOuter(0).tickFormat(format('.9'))
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

      drawCategoricalAxis = () => {
        if (axis && ordinalScale) {
          const tickLength = layout.getAxisLength(otherPlace(place)) ?? 0,
            textHeight = getStringBounds().height,
            categories = ordinalScale?.domain() ?? [],
            collision = collisionExists({bandWidth, categories, centerCategoryLabels}),
            {translation, rotation, textAnchor} = getCategoricalLabelPlacement(place, centerCategoryLabels,
              collision, bandWidth, textHeight)
          if (!subAxisElt) return
          select(subAxisElt)
            .attr("transform", initialTransform)
            .call(axis(ordinalScale).tickSizeOuter(0))
            // Remove everything but the path the forms the axis line
            .selectAll('g').remove()
          // select(subAxisElt).selectAll('line').remove()
          select(subAxisElt).append('g')
            .transition().duration(duration)
            .attr('transform', `translate(${axisIsVertical ? 0 : bandWidth / 2}, ` +
              `${axisIsVertical ? bandWidth / 2 : 0})`)
            .call(axis(ordinalScale).tickSizeInner(-tickLength))
            .selectAll('.domain').remove()
          select(subAxisElt).selectAll('text')
            .style('text-anchor', textAnchor)
            .attr('transform', `${translation}${rotation}`)
        }
      }

    // When switching from one axis type to another, e.g. a categorical axis to an
    // empty axis, d3 will use existing ticks (in DOM) to initialize the new scale.
    // To avoid that, we manually remove the ticks before initializing the axis.
    select(subAxisElt).selectAll('.tick').remove()

    d3Scale.range(axisIsVertical ? [rangeMax, rangeMin] : [rangeMin, rangeMax])
    switch (type) {
      case 'numeric':
      case 'empty':
        drawAxis()
        showScatterPlotGridLines && drawScatterPlotGridLines()
        break
      case 'categorical':
        drawCategoricalAxis()
        break
    }
  }, [subAxisElt, layout, showScatterPlotGridLines, enableAnimation,
    centerCategoryLabels, axisModel, isNumeric, subAxisIndex])

  // update d3 scale and axis when scale type changes
  useEffect(() => {
    if (axisModel) {
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
    }
  }, [isNumeric, axisModel, layout, refreshSubAxis])

  // Install reaction to bring about rerender when layout's computedBounds changes
  useEffect(() => {
    const disposer = reaction(
      () => layout.getComputedBounds(axisModel?.place ?? 'bottom'),
      () => refreshSubAxis()
    )
    return () => disposer()
  }, [layout, refreshSubAxis, axisModel?.place])

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
      const disposer = autorun(() => {
        const values = layout.getAxisMultiScale(axisModel.place)?.categorySetValues
        if (values?.length) {
          refreshSubAxis()
        }
      })
      return () => disposer()
    }
  }, [axisModel, refreshSubAxis, layout, isCategorical])

  // update d3 scale and axis when layout/range changes
  useEffect(() => {
    const disposer = reaction(
      () => {
        return layout.getAxisLength(axisModel?.place ?? 'bottom')
      },
      () => {
        refreshSubAxis()
      }
    )
    return () => disposer()
  }, [axisModel, layout, refreshSubAxis])

  /*
    useEffect(function respondToCategorySetsChange() {
      return reaction(
        () => dataConfiguration?.categoryArrayForAttrRole('legend'),
        () => {
          refreshSubAxis()
        })
    }, [dataConfiguration, refreshSubAxis])
  */

  // update on component refresh
  useEffect(() => {
    refreshSubAxis()
  }, [refreshSubAxis, multiScaleChangeCount])

}
