import {
  axisBottom, axisLeft, ScaleBand, scaleLinear, scaleLog, scaleOrdinal, select} from "d3"
import {autorun, reaction} from "mobx"
import {MutableRefObject, useCallback, useEffect, useRef} from "react"
import {AxisBounds, axisGap, isVertical, ScaleNumericBaseType} from "../axis-types"
import {useAxisLayoutContext} from "../models/axis-layout-context"
import {otherPlace, IAxisModel, INumericAxisModel} from "../models/axis-model"
import {between} from "../../../utilities/math-utils"
import {graphPlaceToAttrRole, transitionDuration} from "../../graph/graphing-types"
import {maxWidthOfStringsD3} from "../../graph/utilities/graph-utils"
import {useDataConfigurationContext} from "../../graph/hooks/use-data-configuration-context"
import {getCategoricalLabelPlacement} from "../axis-utils"
import {measureTextExtent} from "../../../hooks/use-measure-text"

export interface IUseAxis {
  axisModel?: IAxisModel
  axisElt: SVGGElement | null
  titleRef: MutableRefObject<SVGGElement | null>
  label?: string
  enableAnimation: MutableRefObject<boolean>
  showScatterPlotGridLines: boolean
  centerCategoryLabels: boolean
}

export const useAxis = ({
                          axisModel, axisElt, titleRef, label = "",
                          showScatterPlotGridLines, centerCategoryLabels, enableAnimation
                        }: IUseAxis) => {
  const layout = useAxisLayoutContext(),
    isNumeric = axisModel?.isNumeric,
    place = axisModel?.place ?? 'bottom',
    scale = layout.getAxisScale(place) as ScaleNumericBaseType,
    ordinalScale = isNumeric || axisModel?.type === 'empty' ? null : scale as unknown as ScaleBand<string>,
    bandWidth = ordinalScale?.bandwidth() ?? 0,
    axis = (place === 'bottom') ? axisBottom : axisLeft,
    // By all rights, the following three lines should not be necessary to get installDomainSync to run when
    // GraphController:processV2Document installs a new axis model.
    // Todo: Revisit and figure out whether we can remove the workaround.
    previousAxisModel = useRef<IAxisModel>(),
    axisModelChanged = previousAxisModel.current !== axisModel,
    dataConfiguration = useDataConfigurationContext(),
    axisPlace = axisModel?.place ?? 'bottom',
    attrRole = graphPlaceToAttrRole(axisPlace),
    range = scale?.range() || [0, 100],
    [rangeMin, rangeMax] = range.length === 2 ? range : [0, 100],
    halfRange = Math.abs(rangeMax - rangeMin) / 2,
    type = axisModel?.type ?? 'empty',
    attributeID = dataConfiguration?.attributeID(attrRole)
  previousAxisModel.current = axisModel

  const getLabelBounds = (s = 'Wy') => {
      return measureTextExtent(s, '12px sans-serif')
  }

  const collisionExists = useCallback(() => {
    /* A collision occurs when two labels overlap.
     * This can occur when labels are centered on the tick, or when they are left-aligned.
     * The former requires computation of two adjacent label widths.
     */
    const narrowedBandwidth = bandWidth - 5,
      categories = ordinalScale?.domain() ?? [],
      labelWidths = categories.map(category => getLabelBounds(category).width)
    return centerCategoryLabels ? labelWidths.some((width, i) => {
      return i > 0 && width / 2 + labelWidths[i - 1] / 2 > narrowedBandwidth
    }) : labelWidths.some(width => width > narrowedBandwidth)
  }, [bandWidth, centerCategoryLabels, ordinalScale])

  const computeDesiredExtent = useCallback(() => {
    const labelHeight = getLabelBounds(label).height,
      collision = collisionExists(),
      maxLabelExtent = maxWidthOfStringsD3(dataConfiguration?.categorySetForAttrRole(attrRole) ?? [])
    let desiredExtent = labelHeight + 2 * axisGap
    let ticks: string[] = []
    switch (type) {
      case 'numeric': {
        const format = scale.tickFormat && scale.tickFormat()
        ticks = ((scale.ticks?.()) ?? []).map(tick => format(tick))
        desiredExtent += axisPlace === 'left' ?
          Math.max(getLabelBounds(ticks[0]).width, getLabelBounds(ticks[ticks.length - 1]).width) + axisGap :
          labelHeight
        break
      }
      case 'categorical': {
        const labelExtent = (axisPlace === 'bottom') ? labelHeight : getLabelBounds().width
        desiredExtent += collision ? maxLabelExtent : labelExtent
        break
      }
    }
    return desiredExtent
  }, [axisPlace, attrRole, dataConfiguration, label, type, scale, collisionExists])

  const refreshAxis = useCallback(() => {
    const axisBounds = layout.getComputedBounds(axisPlace) as AxisBounds,
      labelBounds = getLabelBounds(label),
      duration = enableAnimation.current ? transitionDuration : 0,
      axisIsVertical = isVertical(axisPlace),
      initialTransform = (place === 'left') ? `translate(${axisBounds.left + axisBounds.width}, ${axisBounds.top})` :
        `translate(${axisBounds.left}, ${axisBounds.top})`

    const drawAxis = () => {
        select(axisElt)
          .attr("transform", initialTransform)
          .transition().duration(duration)
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore types are incompatible
          .call(axis(scale).tickSizeOuter(0))
      },

      drawScatterPlotGridLines = () => {
        select(axisElt).selectAll('.zero, .grid').remove()
        const tickLength = layout.getAxisLength(otherPlace(axisPlace)) ?? 0
        select(axisElt).append('g')
          .attr('class', 'grid')
          .call(axis(scale).tickSizeInner(-tickLength))
        select(axisElt).select('.grid').selectAll('text').remove()
        const numericScale = scale as ScaleNumericBaseType
        if (between(0, numericScale.domain()[0], numericScale.domain()[1])) {
          select(axisElt).append('g')
            .attr('class', 'zero')
            .call(axis(scale).tickSizeInner(-tickLength).tickValues([0]))
          select(axisElt).select('.zero').selectAll('text').remove()
        }
      },

      drawCategoricalAxis = () => {
        const tickLength = layout.getAxisLength(otherPlace(axisPlace)) ?? 0,
          textHeight = getLabelBounds().height,
          collision = collisionExists()
        const {translation, rotation, textAnchor } = getCategoricalLabelPlacement(axisPlace, centerCategoryLabels,
          collision, bandWidth, textHeight)
        select(axisElt)
          .attr("transform", initialTransform)
          // @ts-expect-error types are incompatible
          .call(axis(scale).tickSizeOuter(0))
          // Remove everything but the path the forms the axis line
          .selectAll('g').remove()
        // select(axisElt).selectAll('line').remove()
        select(axisElt).append('g')
          .transition().duration(duration)
          .attr('transform', `translate(${axisIsVertical ? 0 : bandWidth / 2}, ` +
            `${axisIsVertical ? bandWidth / 2 : 0})`)
          .call(axis(scale).tickSizeInner(-tickLength))
          .selectAll('.domain').remove()
        select(axisElt).selectAll('text')
          .style('text-anchor', textAnchor)
          .attr('transform', `${translation}${rotation}`)
      },

      drawAxisTitle = () => {
        const
          titleTransform = `translate(${axisBounds.left}, ${axisBounds.top})`,
          tX = (place === 'left') ? getLabelBounds(label).height : halfRange,
          tY = (place === 'bottom') ? axisBounds.height - labelBounds.height / 2 : halfRange,
          tRotation = place === 'bottom' ? '' : ` rotate(-90,${tX},${tY})`
        if (titleRef) {
          select(titleRef.current)
            .selectAll('text.axis-title')
            .data([1])
            .join(
              // @ts-expect-error void => Selection
              // eslint-disable-next-line @typescript-eslint/no-empty-function
              () => {
              },
              (update) => {
                update
                  .attr("transform", titleTransform + tRotation)
                  .attr('x', tX)
                  .attr('y', tY)
                  .text(label)
              })
        }
      }

    // When switching from one axis type to another, e.g. a categorical axis to an
    // empty axis, d3 will use existing ticks (in DOM) to initialize the new scale.
    // To avoid that, we manually remove the ticks before initializing the axis.
    select(axisElt).selectAll('.tick').remove()

    scale.range(axisIsVertical ? [axisBounds.height, 0] : [0, axisBounds.width])
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
    drawAxisTitle()
  }, [axisElt, axisPlace, axis, layout, showScatterPlotGridLines, scale, enableAnimation,
    place, titleRef, label, halfRange, type, bandWidth, collisionExists, centerCategoryLabels,])

  // update d3 scale and axis when scale type changes
  useEffect(() => {
    if (axisModel) {
      const disposer = reaction(
        () => {
          const {place: aPlace, scale: scaleType} = axisModel
          return {place: aPlace, scaleType}
        },
        ({place: aPlace, scaleType}) => {
          const newScale =
            scaleType === 'log' ? scaleLog() :
              scaleType === 'linear' ? scaleLinear() :
                scaleOrdinal()
          layout.setAxisScale(aPlace, newScale)
          refreshAxis()
        }
      )
      return () => disposer()
    }
  }, [isNumeric, axisModel, layout, refreshAxis])

  // Install reaction to bring about rerender when layout's computedBounds changes
  useEffect(() => {
    const disposer = reaction(
      () => layout.getComputedBounds(axisPlace),
      () => refreshAxis(/*myBounds*/)
    )
    return () => disposer()
  }, [axisPlace, layout, refreshAxis])

  // update d3 scale and axis when axis domain changes
  useEffect(function installDomainSync() {
    if (isNumeric) {
      const disposer = autorun(() => {
        const numericModel = axisModel as INumericAxisModel
        if (numericModel.domain) {
          const {domain} = numericModel
          scale?.domain(domain)
          layout.setDesiredExtent(axisPlace, computeDesiredExtent())
          refreshAxis()
        }
      })
      return () => disposer()
    }
    // Note axisModelChanged as a dependent. Shouldn't be necessary.
  }, [axisModelChanged, isNumeric, axisModel, refreshAxis, scale, axisPlace, layout, computeDesiredExtent])

  // update d3 scale and axis when layout/range changes
  useEffect(() => {
    const disposer = reaction(
      () => {
        return layout.getAxisLength(axisPlace)
      },
      () => {
        refreshAxis()
      }
    )
    return () => disposer()
  }, [axisModel, layout, refreshAxis, axisPlace])

  // Set desired extent
  useEffect(() => {
    layout.setDesiredExtent(axisPlace, computeDesiredExtent())
  }, [computeDesiredExtent, axisPlace, attributeID, layout])

  useEffect(function setupTitle() {
    if (titleRef) {
      select(titleRef.current)
        .selectAll('text.axis-title')
        .data([1])
        .join(
          // @ts-expect-error void => Selection
          (enter) => {
            enter.append('text')
              .attr('class', 'axis-title')
              .attr('text-anchor', 'middle')
              .attr('data-testid', `axis-title-${place}`)
          })
    }
  }, [axisElt, halfRange, label, place, titleRef])

  // update on component refresh
  useEffect(() => {
    refreshAxis()
  }, [refreshAxis])

}
