import { comparer, reaction } from "mobx"
import {isAlive} from "mobx-state-tree"
import { useCallback, useEffect } from "react"
import {useDebouncedCallback} from "use-debounce"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {isSetCaseValuesAction} from "../../../models/data/data-set-actions"
import {mstAutorun} from "../../../utilities/mst-autorun"
import {mstReaction} from "../../../utilities/mst-reaction"
import {onAnyAction} from "../../../utilities/mst-utils"
import {IAxisModel} from "../../axis/models/axis-model"
import {GraphAttrRoles} from "../../data-display/data-display-types"
import {matchCirclesToData} from "../../data-display/data-display-utils"
import { PixiPointEventHandler, PixiPoints } from "../../data-display/pixi/pixi-points"
import { syncModelWithAttributeConfiguration } from "../models/graph-model-utils"
import { updateCellMasks } from "../utilities/graph-utils"
import {useGraphContentModelContext} from "./use-graph-content-model-context"
import {useGraphLayoutContext} from "./use-graph-layout-context"

export interface IPixiDragHandlers {
  start: PixiPointEventHandler
  drag: PixiPointEventHandler
  end: PixiPointEventHandler
}

export const usePixiDragHandlers = (pixiPoints: PixiPoints | undefined, {start, drag, end}: IPixiDragHandlers) => {
  useEffect(() => {
    if (pixiPoints) {
      pixiPoints.onPointDragStart = start
      pixiPoints.onPointDrag = drag
      pixiPoints.onPointDragEnd = end
      // On cleanup, remove event listeners
      return () => {
        pixiPoints.onPointDragStart = undefined
        pixiPoints.onPointDrag = undefined
        pixiPoints.onPointDragEnd = undefined
      }
    }
  }, [pixiPoints, start, drag, end])
}

export interface IPlotResponderProps {
  refreshPointPositions: (selectedOnly: boolean) => void
  refreshPointSelection: () => void
  pixiPoints?: PixiPoints
}

function isDefunctAxisModel(axisModel?: IAxisModel) {
  return axisModel && !isAlive(axisModel)
}

export const usePlotResponders = (props: IPlotResponderProps) => {
  const { refreshPointPositions, refreshPointSelection, pixiPoints} = props,
    graphModel = useGraphContentModelContext(),
    startAnimation = graphModel.startAnimation,
    layout = useGraphLayoutContext(),
    dataConfiguration = graphModel.dataConfiguration,
    legendAttrID = dataConfiguration?.attributeID("legend"),
    dataset = dataConfiguration?.dataset,
    metadata = dataConfiguration?.metadata,
    instanceId = useInstanceIdContext()

  interface IRefreshProps {
    selectedOnly?: boolean
    updateMasks?: boolean
  }
  const callRefreshPointPositions = useDebouncedCallback((_props?: IRefreshProps) => {
    const { selectedOnly = false, updateMasks = false } = _props || {}
    if (updateMasks) {
      updateCellMasks({ dataConfig: dataConfiguration, layout, pixiPoints })
    }
    refreshPointPositions(selectedOnly)
  })

  const callMatchCirclesToData = useCallback(() => {
    pixiPoints && matchCirclesToData({
      dataConfiguration,
      pointRadius: graphModel.getPointRadius(),
      pointColor: graphModel.pointDescription.pointColor,
      pointDisplayType: graphModel.plot.displayType,
      pointStrokeColor: graphModel.pointDescription.pointStrokeColor,
      pixiPoints,
      startAnimation, instanceId
    })
  }, [dataConfiguration, graphModel, instanceId, pixiPoints, startAnimation])

  // Refresh point positions when pixiPoints become available to fix this bug:
  // https://www.pivotaltracker.com/story/show/188333898
  // This might be a workaround for the fact that useDebouncedCallback may not be updated when pixiPoints
  // (a dependency of refreshPointPositions) are updated. useDebouncedCallback doesn't seem to declare any
  // dependencies, and I'd imagine it returns a stable result (?).
  useEffect(() => {
    callRefreshPointPositions()
  }, [callRefreshPointPositions, pixiPoints])

  // respond to numeric axis domain changes (e.g. axis dragging)
  useEffect(() => {
    return mstReaction(
      () => {
        const xNumeric = graphModel.getNumericAxis('bottom')
        const yNumeric = graphModel.getNumericAxis('left')
        const v2Numeric = graphModel.getNumericAxis('rightNumeric')
        if (isDefunctAxisModel(xNumeric) || isDefunctAxisModel(yNumeric) || isDefunctAxisModel(v2Numeric)) {
          console.warn("usePlot numeric domains reaction skipped for defunct axis model(s)")
          return
        }
        const {domain: xDomain} = xNumeric || {}
        const {domain: yDomain} = yNumeric || {}
        const {domain: v2Domain} = v2Numeric || {}
        return [xDomain, yDomain, v2Domain]
      },
      () => {
        callRefreshPointPositions()
      }, {name: "usePlot [numeric domains]", equals: comparer.structural, fireImmediately: true}, graphModel
    )
  }, [callRefreshPointPositions, graphModel])

  useEffect(function respondToCategorySetChanges() {
    return mstReaction(() => {
      return [dataConfiguration.allCategoriesForRoles, dataConfiguration.categoricalAttrsWithChangeCounts]
    }, () => {
      startAnimation()
      callRefreshPointPositions({ updateMasks: true })
    }, {name: "usePlot.respondToCategorySetChanges", equals: comparer.structural}, dataConfiguration)
  }, [callRefreshPointPositions, dataConfiguration, startAnimation])

  // respond to attribute assignment changes
  useEffect(() => {
    const disposer = mstReaction(
      () => GraphAttrRoles.map((aRole) => dataConfiguration?.attributeID(aRole)),
      () => {
        if (syncModelWithAttributeConfiguration(graphModel, layout)) {
          startAnimation()
          callRefreshPointPositions()
        }
      }, {name: "usePlot [attribute assignment]"}, dataConfiguration
    )
    return () => disposer()
  }, [callRefreshPointPositions, dataConfiguration, graphModel, layout, startAnimation])

  useEffect(function respondToHiddenCasesChange() {
    const disposer = mstReaction(
      () => dataConfiguration?.caseDataHash,
      () => {
        if (!pixiPoints) {
          return
        }
        callMatchCirclesToData()
        callRefreshPointPositions()
      }, {name: "respondToHiddenCasesChange"}, dataConfiguration
    )
    return () => disposer()
  }, [callMatchCirclesToData, callRefreshPointPositions, dataConfiguration, pixiPoints])

  // respond to axis range changes (e.g. component resizing)
  useEffect(() => {
    return reaction(
      () => [layout.getAxisLength('left'), layout.getAxisLength('bottom')],
      () => {
        callRefreshPointPositions()
      }, {name: "usePlot [axis range]"}
    )
  }, [layout, callRefreshPointPositions])

  // respond to selection changes
  useEffect(function respondToSelectionChanges() {
    if (dataset) {
      return mstReaction(
        () => dataset?.selectionChanges,
        () => {
          refreshPointSelection()
        },
        {name: "useSubAxis.respondToSelectionChanges"}, dataConfiguration
      )
    }
  }, [callMatchCirclesToData, callRefreshPointPositions, dataConfiguration, dataset, refreshPointSelection])

  // respond to value changes
  useEffect(() => {
    if (dataset) {
      const disposer = onAnyAction(dataset, action => {
        if (isSetCaseValuesAction(action)) {
          // If we're caching then only selected cases need to be updated in scatterplots. But for dotplots
          // we need to update all points because the unselected points positions change.
          callRefreshPointPositions({ selectedOnly: dataset.isCaching() && graphModel.plotType !== "dotPlot" })
        }
      })
      return () => disposer()
    }
  }, [dataset, callRefreshPointPositions, graphModel.plotType])

  // respond to plotType changes
  useEffect(function respondToPointConfigChange() {
    return mstReaction(
      () => graphModel.plotType,
      () => {
        if (!pixiPoints) return

        callMatchCirclesToData()
        callRefreshPointPositions()
      }, {name: "usePlot [pointDisplayType]"}, graphModel
    )
  }, [callMatchCirclesToData, callRefreshPointPositions, graphModel, pixiPoints])

  useEffect(() => {
    return mstReaction(
      () => graphModel.dataConfiguration.legendColorDomain,
      () => {
        callRefreshPointPositions({ updateMasks: true })
      }, {name: "usePlot [legendColorChange]"}, graphModel)
  }, [graphModel, callRefreshPointPositions])

  // respond to pointsNeedUpdating becoming false; that is when the points have been updated
  // Happens when the number of plots has changed for now. Possibly other situations in the future.
  useEffect(() => {
    return mstAutorun(
      () => {
        !graphModel.dataConfiguration.pointsNeedUpdating && callRefreshPointPositions()
      }, {name: "usePlot [callRefreshPointPositions]"}, graphModel)
  }, [graphModel, callRefreshPointPositions])

  // respond to point properties change
  useEffect(function respondToPointVisualChange() {
    return mstReaction(() => {
      const { pointColor, pointStrokeColor, pointStrokeSameAsFill, pointSizeMultiplier } =
        graphModel.pointDescription
      return [pointColor, pointStrokeColor, pointStrokeSameAsFill, pointSizeMultiplier]
    },
      () => callRefreshPointPositions(),
      {name: "respondToPointVisualChange", equals: comparer.structural}, graphModel
    )
  }, [callRefreshPointPositions, graphModel])

  // respond to attribute color change
  useEffect(function respondToColorChange() {
    return mstReaction(
      () => metadata?.getAttributeColorRange(legendAttrID),
      () => callRefreshPointPositions(),
      { name: "usePlotResponders respondToColorChange", equals: comparer.structural }, metadata
    )
  }, [callRefreshPointPositions, legendAttrID, metadata])
}
