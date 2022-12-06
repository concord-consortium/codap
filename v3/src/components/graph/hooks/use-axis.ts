import {
  axisBottom, axisLeft, scaleLinear,
  scaleLog, scaleOrdinal, select, selection
} from "d3"
import {autorun, reaction} from "mobx"
import {MutableRefObject, useCallback, useEffect, useRef} from "react"
import {otherPlace, IAxisModel, INumericAxisModel, graphPlaceToAttrPlace} from "../models/axis-model"
import {Bounds, ScaleNumericBaseType, useGraphLayoutContext} from "../models/graph-layout"
import {between} from "../utilities/math-utils"
import {transitionDuration, axisGap} from "../graphing-types"
import {maxWidthOfStringsD3} from "../utilities/graph-utils"
import {useDataConfigurationContext} from "./use-data-configuration-context"
import t from "../../../utilities/translation/translate"

export interface IUseAxis {
  axisModel?: IAxisModel
  axisElt: SVGGElement | null
  titleRef: MutableRefObject<SVGGElement | null>
  label?: string
  enableAnimation: MutableRefObject<boolean>
  showGridLines: boolean,
  scale: any
  inGraph: boolean | undefined
}

export const useAxis = ({
                          axisModel, axisElt, titleRef, label = t('DG.AxisView.emptyGraphCue'),
                          showGridLines, enableAnimation, scale, inGraph
                        }: IUseAxis) => {
  const layout = useGraphLayoutContext(),
    place = axisModel?.place ?? 'bottom',
    //  scale = layout.axisScale(place) as ScaleNumericBaseType,
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
    [xMin, xMax] = scale?.range() || [0, 100],
    halfRange = Math.abs(xMax - xMin) / 2,
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
    const duration = enableAnimation.current ? transitionDuration : 0
    if (axisElt) {
      const axisBounds = layout.computedBounds.get(axisPlace) as Bounds,
        labelBounds = getLabelBounds(label)
      // When switching from one axis type to another, e.g. a categorical axis to an
      // empty axis, d3 will use existing ticks (in DOM) to initialize the new scale.
      // To avoid that, we manually remove the ticks before initializing the axis.
      select(axisElt).selectAll('.tick').remove()

      scale.range(layout.isVertical(axisPlace) ? [axisBounds.height, 0] : [0, axisBounds.width])

      // NEXT - this works, but we should pass bounds instead, may not need inGraph calc above

      const transform = (place === 'left')
        ? `translate(${axisBounds.left + axisBounds.width}, ${axisBounds.top})`
        :`translate(${axisBounds.left}, ${axisBounds.top})`

      const nTransform = inGraph
        ? transform
        : null

      select(axisElt)
        .attr("transform", nTransform)
        .transition().duration(duration)
        .call(axis(scale).tickSizeOuter(0))

      // Onward to gridlines
      select(axisElt).selectAll('.zero').remove()
      select(axisElt).selectAll('.grid').remove()

      if (showGridLines) {
        const tickLength = layout.axisLength(otherPlace(axisPlace)) ?? 0,
          numericScale = scale as ScaleNumericBaseType
        select(axisElt).append('g')
          .attr('class', 'grid')
          .call(axis(scale).tickSizeInner(-tickLength))
        select(axisElt).select('.grid').selectAll('text').remove()

        if (between(0, numericScale.domain()[0], numericScale.domain()[1])) {
          select(axisElt).append('g')
            .attr('class', 'zero')
            .call(axis(scale).tickSizeInner(-tickLength).tickValues([0]))
          select(axisElt).select('.zero').selectAll('text').remove()
        }
      }

      // Onward to axis title
      const
        titleTransform = `translate(${axisBounds.left}, ${axisBounds.top})`,
        tX = (place === 'left') ? getLabelBounds(label).height - axisGap : halfRange,
        tY = (place === 'bottom') ? axisBounds.height - labelBounds.height / 2 : halfRange,
        tRotation = place === 'bottom' ? '' : ` rotate(-90,${tX},${tY})`
      if(titleRef) {
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
  }, [axisElt, axisPlace, axis, layout, showGridLines, scale, enableAnimation,
    place, titleRef, label, halfRange])

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
      () => layout.computedBounds.get(axisPlace),
      () => refreshAxis(/*myBounds*/)
    )
    return () => disposer()
  }, [isNumeric, axisModel, layout, refreshAxis, axisPlace])

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
        return layout.axisLength(axisPlace)
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
    if( titleRef) {
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
