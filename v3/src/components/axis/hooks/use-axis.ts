import { ScaleLinear, scaleLinear, scaleOrdinal } from "d3"
import { comparer } from "mobx"
import { isAlive } from "mobx-state-tree"
import { useCallback, useEffect } from "react"
import { mstAutorun } from "../../../utilities/mst-autorun"
import { mstReaction } from "../../../utilities/mst-reaction"
import { axisPlaceToAttrRole, graphPlaceToAttrRole } from "../../data-display/data-display-types"
import { maxWidthOfStringsD3 } from "../../data-display/data-display-utils"
import { useDataConfigurationContext } from "../../data-display/hooks/use-data-configuration-context"
import { useDataDisplayModelContextMaybe } from "../../data-display/hooks/use-data-display-model"
import { IDataDisplayContentModel } from "../../data-display/models/data-display-content-model"
import { kColorAxisExtent } from "../axis-constants"
import { AxisPlace, AxisScaleType, axisGap } from "../axis-types"
import { collisionExists, getNumberOfLevelsForDateAxis, getStringBounds, isScaleLinear } from "../axis-utils"
import { useAxisLayoutContext } from "../models/axis-layout-context"
import { isColorAxisModel } from "../models/categorical-axis-models"
import { MultiScale } from "../models/multi-scale"
import { isAnyNumericAxisModel, isDateAxisModel } from "../models/numeric-axis-models"
import { useAxisProviderContext } from "./use-axis-provider-context"

import vars from "../../vars.scss"

interface IGetTicksProps {
  d3Scale: AxisScaleType | ScaleLinear<number, number>
  isBinned: boolean
  multiScale?: MultiScale
  displayModel?: IDataDisplayContentModel
}

const getTicks = (props: IGetTicksProps) => {
  const {d3Scale, isBinned, multiScale, displayModel} = props
  if (!isScaleLinear(d3Scale)) return []

  let ticks: string[]
  if (isBinned && displayModel && multiScale) {
    const formatter = (value: number) => multiScale.formatValueForScale(value)
    const {tickValues, tickLabels} = displayModel.nonDraggableAxisTicks(formatter)
    ticks = tickValues.map((_tickValue, i) => {
      return tickLabels[i]
    })
  } else {
    const formatTick = d3Scale.tickFormat?.()
    ticks = (d3Scale.ticks?.() ?? []).map(tick => formatTick(tick))
  }
  return ticks
}

export const useAxis = (axisPlace: AxisPlace) => {
  const layout = useAxisLayoutContext(),
    displayModel = useDataDisplayModelContextMaybe(),
    axisProvider = useAxisProviderContext(),
    axisModel = axisProvider.getAxis(axisPlace),
    isNumeric = isAnyNumericAxisModel(axisModel),
    multiScale = layout.getAxisMultiScale(axisPlace),
    dataConfiguration = useDataConfigurationContext(),
    attrId = dataConfiguration?.attributeID(axisPlaceToAttrRole[axisPlace]) || "",
    axisAttribute = dataConfiguration?.dataset?.getAttribute(attrId),
    axisAttributeType = axisAttribute?.type
  const computeDesiredExtent = useCallback(() => {
    if (dataConfiguration?.placeCanHaveZeroExtent(axisPlace)) {
      return 0
    }
    const _axisModel = axisProvider?.getNumericAxis?.(axisPlace)
    const attrRole = graphPlaceToAttrRole[axisPlace]
    const axisType = axisModel?.type ?? 'empty'
    const isColor = isColorAxisModel(axisModel) || axisAttributeType === 'color'
    const isBinned = axisModel ? axisProvider?.hasBinnedNumericAxis(axisModel) : false
    const labelFont = vars.labelFont,
      axisTitleHeight = getStringBounds("Xy", labelFont).height,
      numbersHeight = getStringBounds('0').height,
      repetitions = multiScale?.repetitions ?? 1,
      d3Scale = multiScale?.scale ?? (isNumeric ? scaleLinear() : scaleOrdinal())
    let desiredExtent = axisTitleHeight + 2 * axisGap
    let ticks: string[] = []
    switch (axisType) {
      case 'count':
      case 'percent':
      case 'numeric': {
        ticks = getTicks({d3Scale, isBinned, multiScale, displayModel})
        desiredExtent += ['left', 'rightNumeric'].includes(axisPlace) || axisModel?.labelsAreRotated
          ? Math.max(getStringBounds(ticks[0]).width, getStringBounds(ticks[ticks.length - 1]).width) + axisGap
          : numbersHeight + axisGap
        break
      }
      case 'categorical':
      case 'color': {
        // We compute the desired bandWidth from the axis length and the number of categories. rather than
        // from the multiScale. This is because during restore the multiScale has not been set up yet.
        const axisLength = layout.getAxisLength(axisPlace),
          categories = dataConfiguration?.categoryArrayForAttrRole(attrRole) ?? [],
          centerCategoryLabels = dataConfiguration?.categoriesForAxisShouldBeCentered(axisPlace) ?? true,
          bandWidth = axisLength / categories.length / repetitions,
          collision = collisionExists({bandWidth, categories, centerCategoryLabels})
        desiredExtent += isColor ? kColorAxisExtent
                                  : collision ? maxWidthOfStringsD3(categories) : getStringBounds().height
        break
      }
      case 'date': {
        if (isDateAxisModel(_axisModel)) {
          const [min, max] = _axisModel.domain
          desiredExtent += getNumberOfLevelsForDateAxis(min, max) * numbersHeight + axisGap
        }
        break
      }
    }
    return desiredExtent
  }, [axisAttributeType, axisModel, axisPlace, axisProvider, dataConfiguration, displayModel,
      isNumeric, layout, multiScale])

  // update d3 scale and axis when scale type changes
  useEffect(() => {
    if (axisModel) {
      const disposer = mstReaction(
        () => {
          const {place: aPlace, scale: scaleType} = axisModel
          return {place: aPlace, scaleType}
        },
        ({place: aPlace, scaleType}) => {
          layout.getAxisMultiScale(aPlace)?.setScaleType(scaleType)
        }, {name: "useAxis [scaleType]"}, axisModel
      )
      return () => disposer()
    }
  }, [isNumeric, axisModel, layout])

  // update d3 scale and axis when axis domain changes
  useEffect(function axisDomainSync() {
    if (isNumeric) {
      return mstReaction(
        () => {
          const _axisModel = axisProvider?.getNumericAxis?.(axisPlace)
          if (_axisModel && !isAlive(_axisModel)) {
            console.warn("useAxis.axisDomainSync skipping sync of defunct axis model")
            return
          }
          return _axisModel ? [..._axisModel.domain] : undefined
        },
        domain => {
          if (domain) {
            multiScale?.setNumericDomain(domain)
          }
          layout.setDesiredExtent(axisPlace, computeDesiredExtent())
        }, { name: "useAxis.axisDomainSync", equals: comparer.structural }, axisProvider)
    }
  }, [axisPlace, axisProvider, isNumeric, multiScale])

  // update desired extent as needed, but note that the axisModel domain is not called during this auto run
  useEffect(() => {
    return mstAutorun(() => {
      layout.setDesiredExtent(axisPlace, computeDesiredExtent())
    }, {name: "useAxis.mstAutorun [setDesiredExtent]"}, axisModel)
  }, [axisModel, layout, axisPlace, computeDesiredExtent])
}
