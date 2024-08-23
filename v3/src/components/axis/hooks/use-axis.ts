import { ScaleBand, ScaleLinear, scaleLinear, scaleOrdinal } from "d3"
import { reaction } from "mobx"
import { isAlive } from "mobx-state-tree"
import { useCallback, useEffect, useRef } from "react"
import { mstAutorun } from "../../../utilities/mst-autorun"
import { mstReaction } from "../../../utilities/mst-reaction"
import { graphPlaceToAttrRole } from "../../data-display/data-display-types"
import { maxWidthOfStringsD3 } from "../../data-display/data-display-utils"
import { useDataConfigurationContext } from "../../data-display/hooks/use-data-configuration-context"
import { AxisPlace, AxisScaleType, axisGap } from "../axis-types"
import { useAxisLayoutContext } from "../models/axis-layout-context"
import { IAxisModel, isDateAxisModel, isNumericAxisModel } from "../models/axis-model"
import { collisionExists, getNumberOfLevelsForDateAxis, getStringBounds, isScaleLinear } from "../axis-utils"
import { useAxisProviderContext } from "./use-axis-provider-context"
import { useDataDisplayModelContext } from "../../data-display/hooks/use-data-display-model"
import { IDataDisplayContentModel } from "../../data-display/models/data-display-content-model"
import { MultiScale } from "../models/multi-scale"

import vars from "../../vars.scss"

export interface IUseAxis {
  axisPlace: AxisPlace
  axisTitle?: string
  centerCategoryLabels: boolean
}

interface IGetTicksProps {
  d3Scale: AxisScaleType | ScaleLinear<number, number>
  multiScale?: MultiScale
  pointDisplayType: string
  displayModel?: IDataDisplayContentModel
}

const getTicks = (props: IGetTicksProps) => {
  const {d3Scale, multiScale, pointDisplayType, displayModel} = props
  if (!isScaleLinear(d3Scale)) return []

  let ticks: string[]
  if (pointDisplayType === "bins" && displayModel && multiScale) {
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

export const useAxis = ({axisPlace, axisTitle = "", centerCategoryLabels}: IUseAxis) => {
  const layout = useAxisLayoutContext(),
    displayModel = useDataDisplayModelContext(),
    axisProvider = useAxisProviderContext(),
    axisModel = axisProvider.getAxis?.(axisPlace),
    isNumeric = axisModel && isNumericAxisModel(axisModel),
    multiScale = layout.getAxisMultiScale(axisPlace),
    ordinalScale = isNumeric || axisModel?.type === 'empty' ? null : multiScale?.scale as ScaleBand<string>,
    // eslint-disable-next-line react-hooks/exhaustive-deps  --  see note below
    categories = ordinalScale?.domain() ?? []
  const
    // By all rights, the following three lines should not be necessary to get installDomainSync to run when
    // GraphController:processV2Document installs a new axis model.
    // Todo: Revisit and figure out whether we can remove the workaround.
    previousAxisModel = useRef<IAxisModel>(),
    axisModelChanged = previousAxisModel.current !== axisModel,
    dataConfiguration = useDataConfigurationContext(),
    attrRole = graphPlaceToAttrRole[axisPlace],
    type = axisModel?.type ?? 'empty',
    attributeID = dataConfiguration?.attributeID(attrRole)
  previousAxisModel.current = axisModel

  /** Todo: from Kirk
   * Looking at the overall format of this code, the computeDesiredExtent() callback lists almost everything that
   * could possibly change as a dependency, meaning that a new callback will be generated after nearly every change.
   * Then there are four useEffects whose primary purpose is to call computeDesiredExtent(), meaning that nearly every
   * change will result in four calls to something like:
   *         layout.setDesiredExtent(axisPlace, computeDesiredExtent())
   * Seems like a situation where a single autorun or possibly reaction would make more sense. Another approach
   * might be to introduce something like an AxisViewModel which could encapsulate some of these computations
   * analogous to the way the CollectionTableModel is a MobX class which encapsulates a number of table-related
   * computations. Then the desiredExtent could be a computed property which is cached automatically.
   */
  const computeDesiredExtent = useCallback(() => {
    if (dataConfiguration?.placeCanHaveZeroExtent(axisPlace)) {
      return 0
    }
    const labelFont = vars.labelFont,
      axisTitleHeight = getStringBounds(axisTitle, labelFont).height,
      numbersHeight = getStringBounds('0').height,
      repetitions = multiScale?.repetitions ?? 1,
      bandWidth = ((ordinalScale?.bandwidth?.()) ?? 0) / repetitions,
      collision = collisionExists({bandWidth, categories, centerCategoryLabels}),
      maxLabelExtent = maxWidthOfStringsD3(dataConfiguration?.categoryArrayForAttrRole(attrRole) ?? []),
      d3Scale = multiScale?.scale ?? (type === 'numeric' ? scaleLinear() : scaleOrdinal()),
      pointDisplayType = displayModel.pointDisplayType
    let desiredExtent = axisTitleHeight + 2 * axisGap
    let ticks: string[] = []
    switch (type) {
      case 'numeric': {
        ticks = getTicks({d3Scale, multiScale, pointDisplayType, displayModel})
        desiredExtent += ['left', 'rightNumeric'].includes(axisPlace)
          ? Math.max(getStringBounds(ticks[0]).width, getStringBounds(ticks[ticks.length - 1]).width) + axisGap
          : numbersHeight + axisGap
        break
      }
      case 'categorical': {
        desiredExtent += collision ? maxLabelExtent : getStringBounds().height
        break
      }
      case 'date': {
        if (isDateAxisModel(axisModel)) {
          desiredExtent += getNumberOfLevelsForDateAxis(axisModel.min, axisModel.max) * numbersHeight + axisGap
        }
        break
      }
    }
  return desiredExtent
}, [dataConfiguration, axisPlace, axisTitle, multiScale, ordinalScale, categories, centerCategoryLabels,
            attrRole, type, displayModel, axisModel]
)

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
      }, {name: "useAxis [scaleType]"}
    )
    return () => disposer()
  }
}, [isNumeric, axisModel, layout])

// update d3 scale and axis when axis domain changes
useEffect(function installDomainSync() {
  if (isNumeric) {
    return mstAutorun(() => {
      const _axisModel = axisProvider?.getNumericAxis?.(axisPlace)
      if (_axisModel && !isAlive(_axisModel)) {
        console.warn("useAxis.installDomainSync skipping sync of defunct axis model")
        return
      }
      _axisModel?.domain && multiScale?.setNumericDomain(_axisModel?.domain)
      layout.setDesiredExtent(axisPlace, computeDesiredExtent())
    }, {name: "useAxis.installDomainSync"}, axisProvider)
  }
  // Note axisModelChanged as a dependent. Shouldn't be necessary.
}, [axisModelChanged, isNumeric, multiScale, axisPlace, layout, computeDesiredExtent, axisProvider])

// update d3 scale and axis when layout/range changes
useEffect(() => {
  const disposer = mstReaction(
    () => {
      return layout.getAxisLength(axisPlace)
    },
    () => {
      layout.setDesiredExtent(axisPlace, computeDesiredExtent())
    }, {name: "useAxis [axisRange]"}, axisModel
  )
  return () => disposer()
}, [axisModel, layout, axisPlace, computeDesiredExtent])

// update d3 scale and axis when pointDisplayType changes
useEffect(() => {
  const disposer = reaction(
    () => {
      return displayModel.pointDisplayType
    },
    () => {
      layout.setDesiredExtent(axisPlace, computeDesiredExtent())
    }, {name: "useAxis [pointDisplayType]"}
  )
  return () => disposer()
}, [axisModel, layout, axisPlace, computeDesiredExtent, displayModel.pointDisplayType])

// Set desired extent when things change
useEffect(() => {
  layout.setDesiredExtent(axisPlace, computeDesiredExtent())
}, [computeDesiredExtent, axisPlace, attributeID, layout])

// Set desired extent when repetitions of my multiscale changes
useEffect(() => {
  const disposer = reaction(
    () => {
      return layout.getAxisMultiScale(axisPlace)?.repetitions
    },
    () => {
      layout.setDesiredExtent(axisPlace, computeDesiredExtent())
    }, {name: "useAxis [axis repetitions]"}
  )
  return () => disposer()
}, [computeDesiredExtent, axisPlace, layout])

}
