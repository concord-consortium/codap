import {ScaleBand, ScaleLinear, scaleLinear, scaleOrdinal, select} from "d3"
import {autorun, reaction} from "mobx"
import {MutableRefObject, useCallback, useEffect, useRef} from "react"
import {AxisBounds, axisGap, isVertical} from "../axis-types"
import {useAxisLayoutContext} from "../models/axis-layout-context"
import {IAxisModel, isNumericAxisModel} from "../models/axis-model"
import {graphPlaceToAttrRole} from "../../graph/graphing-types"
import {maxWidthOfStringsD3} from "../../graph/utilities/graph-utils"
import {useDataConfigurationContext} from "../../graph/hooks/use-data-configuration-context"
import {collisionExists, getStringBounds} from "../axis-utils"

export interface IUseAxis {
  axisModel?: IAxisModel
  axisElt: SVGGElement | null
  titleRef: MutableRefObject<SVGGElement | null>
  axisTitle?: string
  centerCategoryLabels: boolean
}

export const useAxis = ({
                          axisModel, axisElt, titleRef, axisTitle = "",
                          centerCategoryLabels
                        }: IUseAxis) => {
  const layout = useAxisLayoutContext(),
    isNumeric = axisModel && isNumericAxisModel(axisModel),
    place = axisModel?.place ?? 'bottom',
    multiScale = layout.getAxisScale(place),
    ordinalScale = isNumeric || axisModel?.type === 'empty' ? null : multiScale?.scale as ScaleBand<string>
  const
    bandWidth = (ordinalScale?.bandwidth?.()) ?? 0,
    // By all rights, the following three lines should not be necessary to get installDomainSync to run when
    // GraphController:processV2Document installs a new axis model.
    // Todo: Revisit and figure out whether we can remove the workaround.
    previousAxisModel = useRef<IAxisModel>(),
    axisModelChanged = previousAxisModel.current !== axisModel,
    dataConfiguration = useDataConfigurationContext(),
    axisPlace = axisModel?.place ?? 'bottom',
    attrRole = graphPlaceToAttrRole[axisPlace],
    scaleLength = multiScale?.length ?? 0,
    [rangeMin, rangeMax] = [0, scaleLength],
    halfRange = Math.abs(rangeMax - rangeMin) / 2,
    type = axisModel?.type ?? 'empty',
    attributeID = dataConfiguration?.attributeID(attrRole)
  previousAxisModel.current = axisModel

  const computeDesiredExtent = useCallback(() => {
    if (dataConfiguration?.placeCanHaveZeroExtent(axisPlace)) {
      return 0
    }
    const axisTitleHeight = getStringBounds(axisTitle).height,
      numbersHeight = getStringBounds('0').height,
      categories = ordinalScale?.domain() ?? [],
      collision = collisionExists({bandWidth, categories, centerCategoryLabels}),
      maxLabelExtent = maxWidthOfStringsD3(dataConfiguration?.categorySetForAttrRole(attrRole) ?? []),
      d3Scale = multiScale?.scale ?? (type === 'numeric' ? scaleLinear() : scaleOrdinal())
    let desiredExtent = axisTitleHeight + 2 * axisGap
    let ticks: string[] = []
    switch (type) {
      case 'numeric': {
        const format = (d3Scale as ScaleLinear<number, number>).tickFormat?.()
        ticks = (((d3Scale as ScaleLinear<number, number>).ticks?.()) ?? []).map(tick => format(tick))
        desiredExtent += ['left', 'rightNumeric'].includes(axisPlace)
          ? Math.max(getStringBounds(ticks[0]).width, getStringBounds(ticks[ticks.length - 1]).width) + axisGap
          : numbersHeight + axisGap
        break
      }
      case 'categorical': {
        desiredExtent += collision ? maxLabelExtent : getStringBounds().height
        break
      }
    }
    return desiredExtent
  }, [bandWidth, centerCategoryLabels, ordinalScale, axisPlace, attrRole, dataConfiguration,
    axisTitle, type, multiScale])

  const refreshAxisTitle = useCallback(() => {
    const axisBounds = layout.getComputedBounds(axisPlace) as AxisBounds,
      labelBounds = getStringBounds(axisTitle),
      titleTransform = `translate(${axisBounds.left}, ${axisBounds.top})`,
      tX = place === 'left' ? labelBounds.height
        : ['rightNumeric', 'rightCat'].includes(place) ? axisBounds.width - labelBounds.height / 2
          : halfRange,
      tY = isVertical(place) ?  halfRange
        : place === 'top' ? labelBounds.height : axisBounds.height - labelBounds.height / 2,
      tRotation = isVertical(place) ? ` rotate(-90,${tX},${tY})` : ''
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
              .text(axisTitle)
          })
    }

  }, [axisPlace, layout, place, titleRef, axisTitle, halfRange])

  // update d3 scale and axis when scale type changes
  useEffect(() => {
    if (axisModel) {
      const disposer = reaction(
        () => {
          const {place: aPlace, scale: scaleType} = axisModel
          return {place: aPlace, scaleType}
        },
        ({place: aPlace, scaleType}) => {
          layout.getAxisScale(aPlace)?.setScaleType(scaleType)
          refreshAxisTitle()
        }
      )
      return () => disposer()
    }
  }, [isNumeric, axisModel, layout, refreshAxisTitle])

  // Install reaction to bring about rerender when layout's computedBounds changes
  useEffect(() => {
    const disposer = reaction(
      () => layout.getComputedBounds(axisPlace),
      () => refreshAxisTitle()
    )
    return () => disposer()
  }, [axisPlace, layout, refreshAxisTitle])

  // update d3 scale and axis when axis domain changes
  useEffect(function installDomainSync() {
    if (isNumeric) {
      const disposer = autorun(() => {
        const numericModel = axisModel
        if (numericModel.domain) {
          const {domain} = numericModel
          multiScale?.setDomain(domain)
          layout.setDesiredExtent(axisPlace, computeDesiredExtent())
          refreshAxisTitle()
        }
      })
      return () => disposer()
    }
    // Note axisModelChanged as a dependent. Shouldn't be necessary.
  }, [axisModelChanged, isNumeric, axisModel, refreshAxisTitle, multiScale,
    axisPlace, layout, computeDesiredExtent])

  // update d3 scale and axis when layout/range changes
  useEffect(() => {
    const disposer = reaction(
      () => {
        return layout.getAxisLength(axisPlace)
      },
      () => {
        refreshAxisTitle()
      }
    )
    return () => disposer()
  }, [axisModel, layout, refreshAxisTitle, axisPlace])

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
  }, [axisElt, halfRange, axisTitle, place, titleRef])

  // update on component refresh
  useEffect(() => {
    refreshAxisTitle()
  }, [refreshAxisTitle])

}
