import {
  axisBottom, axisLeft, ScaleBand, scaleLinear, scaleLog, scaleOrdinal, select, selection
} from "d3"
import {autorun, reaction} from "mobx"
import {MutableRefObject, useCallback, useEffect, useRef} from "react"
import {AxisBounds, axisGap, isVertical, ScaleNumericBaseType} from "../axis-types"
import {useAxisLayoutContext} from "../models/axis-layout-context"
import {otherPlace, IAxisModel, INumericAxisModel} from "../models/axis-model"
import {between} from "../../../utilities/math-utils"
import {graphPlaceToAttrPlace, transitionDuration} from "../../graph/graphing-types"
import {maxWidthOfStringsD3} from "../../graph/utilities/graph-utils"
import {useDataConfigurationContext} from "../../graph/hooks/use-data-configuration-context"

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
    place = axisModel?.place ?? 'bottom',
    scale = layout.getAxisScale(place) as ScaleNumericBaseType,
    axis = (place === 'bottom') ? axisBottom : axisLeft,
    isNumeric = axisModel?.isNumeric,
    // By all rights, the following three lines should not be necessary to get installDomainSync to run when
    // GraphController:processV2Document installs a new axis model.
    // Todo: Revisit and figure out whether we can remove the workaround.
    previousAxisModel = useRef<IAxisModel>(),
    axisModelChanged = previousAxisModel.current !== axisModel,
    dataConfiguration = useDataConfigurationContext(),
    axisPlace = axisModel?.place ?? 'bottom',
    attrRole = graphPlaceToAttrPlace(axisPlace),
    [rangeMin, rangeMax] = scale?.range() || [0, 100],
    halfRange = (rangeMax !== undefined && rangeMin !== undefined) ? Math.abs(rangeMax - rangeMin) / 2 : 50,
    type = axisModel?.type ?? 'empty',
    attributeID = dataConfiguration?.attributeID(attrRole)
  previousAxisModel.current = axisModel

  const getLabelBounds = (s = 'Wy') => {
    const textElement = selection().append('text').attr('y', 500),
      bounds = textElement.text(s).node()?.getBoundingClientRect() || {left: 0, top: 0, width: 100, height: 20}
    textElement.remove()
    return bounds
  }

  const computeDesiredExtent = useCallback(() => {
    const labelHeight = getLabelBounds(label).height
    let ticks: number[] = []
    let desiredExtent = labelHeight + axisGap
    switch (type) {
      case 'numeric':
        ticks = (scale.ticks?.()) ?? []
        desiredExtent += axisPlace === 'left' ? Math.max(getLabelBounds(String(ticks[0])).width,
          getLabelBounds(String(ticks[ticks.length - 1])).width) : getLabelBounds().height
        break
      case 'categorical':
        desiredExtent += (axisPlace === 'bottom') ? getLabelBounds().height :
          maxWidthOfStringsD3(dataConfiguration?.categorySetForAttrRole(attrRole) ?? [])
    }
    return desiredExtent
  }, [axisPlace, attrRole, dataConfiguration, label, type, scale])

  const refreshAxis = useCallback(() => {
    const axisBounds = layout.getComputedBounds(axisPlace) as AxisBounds,
      labelBounds = getLabelBounds(label),
      duration = enableAnimation.current ? transitionDuration : 0,
      transform = (place === 'left') ? `translate(${axisBounds.left + axisBounds.width}, ${axisBounds.top})` :
        `translate(${axisBounds.left}, ${axisBounds.top})`,

      drawAxis = () => {
        select(axisElt)
          .attr("transform", transform)
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
        const tickLength = layout.axisLength(otherPlace(axisPlace)) ?? 0,
          ordinalScale = scale as unknown as ScaleBand<string>,
          bandWidth = ordinalScale.bandwidth()

        const collisionExists = () => {
          /* A collision occurs when two labels overlap.
           * This can occur labels are centered on the tick, or when they are left-aligned. The former requires
           * computation of two adjacent label widths
           */
          const categories = ordinalScale.domain(),
            labelWidths = categories.map(category => getLabelBounds(category).width)
          return centerCategoryLabels ? labelWidths.some((width, i) => {
            return i > 0 && width / 2 + labelWidths[i - 1] / 2 > bandWidth
          }) : labelWidths.some(width => width > bandWidth)
        }

        const textHeight = getLabelBounds().height,
          collision = collisionExists(),
          rotate = (axisPlace === 'bottom') ?
            (collision ? -90 : 0) : (collision ? 0 : -90)
        select(axisElt)
          .attr("transform", transform)
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore types are incompatible
          .call(axis(scale).tickSizeOuter(0))
          // Remove everything but the path the forms the axis line
          .selectAll('g').remove()
        // select(axisElt).selectAll('line').remove()
        select(axisElt).append('g')
          .transition().duration(duration)
          .attr('transform', `translate(${layout.isVertical(axisPlace) ? 0 : bandWidth / 2}, ` +
            `${layout.isVertical(axisPlace) ? bandWidth / 2 : 0})`)
          .call(axis(ordinalScale).tickSizeInner(-tickLength))
          .selectAll('.domain').remove()
        select(axisElt).selectAll('text')
          .attr('transform', `translate(0,` +
            `${layout.isVertical(axisPlace) ? -textHeight / 3 : 0}) rotate(${rotate})`)
      },

      drawAxisTitle = () => {
        const
          titleTransform = `translate(${axisBounds.left}, ${axisBounds.top})`,
          tX = (place === 'left') ? getLabelBounds(label).height - axisGap : halfRange,
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

    scale.range(layout.isVertical(axisPlace) ? [axisBounds.height, 0] : [0, axisBounds.width])
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
    place, titleRef, label, halfRange, type, centerCategoryLabels])

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
