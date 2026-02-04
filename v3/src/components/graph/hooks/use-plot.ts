import { comparer, reaction } from "mobx"
import {isAlive} from "mobx-state-tree"
import { useCallback, useEffect, useRef } from "react"
import {useDebouncedCallback} from "use-debounce"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {isSetCaseValuesAction} from "../../../models/data/data-set-actions"
import {mstAutorun} from "../../../utilities/mst-autorun"
import {mstReaction} from "../../../utilities/mst-reaction"
import {onAnyAction} from "../../../utilities/mst-utils"
import {IAxisModel} from "../../axis/models/axis-model"
import {GraphAttrRoles} from "../../data-display/data-display-types"
import {matchCirclesToData} from "../../data-display/data-display-utils"
import { PointEventHandler, PointRendererBase } from "../../data-display/renderer"
import { syncModelWithAttributeConfiguration } from "../models/graph-model-utils"
import { updateCellMasks } from "../utilities/graph-utils"
import {useGraphContentModelContext} from "./use-graph-content-model-context"
import {useGraphLayoutContext} from "./use-graph-layout-context"

/**
 * A debounced callback that accumulates boolean options across multiple calls.
 * When multiple calls occur within the debounce window:
 * - `updateMasks`: Uses OR logic (true if ANY call sets true)
 * - `selectedOnly`: Uses AND logic (true only if ALL calls set true)
 *
 * This ensures that if any caller needs masks updated or a full refresh,
 * the final debounced call will honor that requirement.
 */
interface IRefreshProps {
  selectedOnly?: boolean
  updateMasks?: boolean
}

export function useAccumulatingDebouncedCallback(
  callback: (props: IRefreshProps) => void,
  wait?: number
) {
  // Start with selectedOnly=true (AND identity) and updateMasks=false (OR identity)
  const accumulatedRef = useRef<IRefreshProps>({ selectedOnly: true, updateMasks: false })

  const debouncedCallback = useDebouncedCallback(() => {
    callback(accumulatedRef.current)
    // Reset to initial values after execution
    accumulatedRef.current = { selectedOnly: true, updateMasks: false }
  }, wait)

  return useCallback((props?: IRefreshProps) => {
    if (props) {
      // Accumulate updateMasks with OR: if any call wants masks updated, update them
      if (props.updateMasks != null) {
        accumulatedRef.current.updateMasks = accumulatedRef.current.updateMasks || props.updateMasks
      }
      // Accumulate selectedOnly with AND: only true if all calls want selectedOnly
      // A call with selectedOnly=false (or undefined, which defaults to false) means full refresh needed
      if (props.selectedOnly != null) {
        accumulatedRef.current.selectedOnly = accumulatedRef.current.selectedOnly && props.selectedOnly
      } else {
        // undefined means "refresh all" (selectedOnly defaults to false), so AND with false
        accumulatedRef.current.selectedOnly = false
      }
    } else {
      // No props means default behavior: refresh all (selectedOnly=false)
      accumulatedRef.current.selectedOnly = false
    }
    debouncedCallback()
  }, [debouncedCallback])
}

export interface IRendererDragHandlers {
  start: PointEventHandler
  drag: PointEventHandler
  end: PointEventHandler
}

export const useRendererDragHandlers = (
  renderer: PointRendererBase | undefined, {start, drag, end}: IRendererDragHandlers
) => {
  useEffect(() => {
    if (renderer) {
      renderer.onPointerDragStart = start
      renderer.onPointerDrag = drag
      renderer.onPointerDragEnd = end
      // On cleanup, remove event listeners
      return () => {
        renderer.onPointerDragStart = undefined
        renderer.onPointerDrag = undefined
        renderer.onPointerDragEnd = undefined
      }
    }
  }, [renderer, start, drag, end])
}

export interface IPlotResponderProps {
  refreshPointPositions: (selectedOnly: boolean) => void
  refreshPointSelection: () => void
  renderer?: PointRendererBase
}

function isDefunctAxisModel(axisModel?: IAxisModel) {
  return axisModel && !isAlive(axisModel)
}

export const usePlotResponders = (props: IPlotResponderProps) => {
  const { refreshPointPositions, refreshPointSelection, renderer} = props,
    graphModel = useGraphContentModelContext(),
    startAnimation = graphModel.startAnimation,
    layout = useGraphLayoutContext(),
    dataConfiguration = graphModel.dataConfiguration,
    legendAttrID = dataConfiguration?.attributeID("legend"),
    dataset = dataConfiguration?.dataset,
    metadata = dataConfiguration?.metadata,
    instanceId = useInstanceIdContext()

  const callRefreshPointPositions = useAccumulatingDebouncedCallback((_props: IRefreshProps) => {
    const { selectedOnly = false, updateMasks = false } = _props
    if (updateMasks) {
      updateCellMasks({ dataConfig: dataConfiguration, layout, renderer })
    }
    refreshPointPositions(selectedOnly)
  })

  const callMatchCirclesToData = useCallback(() => {
    if (renderer) {
      matchCirclesToData({
        dataConfiguration,
        pointRadius: graphModel.getPointRadius(),
        pointColor: graphModel.pointDescription.pointColor,
        pointDisplayType: graphModel.plot.displayType,
        pointStrokeColor: graphModel.pointDescription.pointStrokeColor,
        renderer,
        startAnimation, instanceId
      })
    }
  }, [dataConfiguration, graphModel, instanceId, renderer, startAnimation])

  // Track the previous renderer to detect actual renderer changes
  const prevRendererRef = useRef<typeof renderer>(undefined)

  // Refresh point positions and selection when renderer becomes available or changes.
  // This handles both initial availability and renderer switches (e.g., when WebGL context is
  // granted after being yielded). We call refreshPointPositions and refreshPointSelection directly
  // (not via debounced callbacks) to ensure they use the new renderer, since useDebouncedCallback
  // may have a stale closure capturing the old renderer reference.
  // See: https://www.pivotaltracker.com/story/show/188333898
  useEffect(() => {
    // Only call matchCirclesToData when the renderer actually changes (not when callbacks change)
    // This prevents startAnimation from being called during axis dragging when callbacks are recreated
    const rendererChanged = renderer !== prevRendererRef.current
    prevRendererRef.current = renderer

    if (rendererChanged) {
      callMatchCirclesToData()
    }
    // Update masks with new renderer
    updateCellMasks({ dataConfig: dataConfiguration, layout, renderer })
    // Call refreshPointPositions directly to ensure it uses the new renderer
    refreshPointPositions(false)
    // Defer refreshPointSelection to run after any other synchronous matchCirclesToData calls
    // (e.g., from useGraphController's setProperties). This ensures legend colors are applied
    // after all points are created.
    Promise.resolve().then(() => {
      refreshPointSelection()
    })
  }, [callMatchCirclesToData, dataConfiguration, layout, renderer, refreshPointPositions, refreshPointSelection])

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
      const updateMasksCallback = () => {
        if (!renderer) return
        // Update subPlotNum values in state before updating masks
        // This ensures sprites get assigned to the correct masks after category reordering
        renderer.updateSubPlotNums(dataConfiguration.caseDataWithSubPlot)
        updateCellMasks({ dataConfig: dataConfiguration, layout, renderer })
      }
      renderer?.removeMasks()
      startAnimation(updateMasksCallback)
      callRefreshPointPositions()
    }, {name: "usePlot.respondToCategorySetChanges", equals: comparer.structural}, dataConfiguration)
  }, [callRefreshPointPositions, dataConfiguration, layout, renderer, startAnimation])

  // respond to attribute assignment changes
  useEffect(() => {
    const disposer = mstReaction(
      () => GraphAttrRoles.map((aRole) => dataConfiguration?.attributeID(aRole)),
      () => {
        syncModelWithAttributeConfiguration(graphModel, layout)
        startAnimation()
        callRefreshPointPositions()
      }, {name: "usePlot [attribute assignment]"}, dataConfiguration
    )
    return () => disposer()
  }, [callRefreshPointPositions, dataConfiguration, graphModel, layout, startAnimation])

  useEffect(function respondToCasesChange() {
    const disposer = mstReaction(
      () => dataConfiguration?.caseDataHash,
      () => {
        if (!renderer) {
          return
        }
        callMatchCirclesToData()
        callRefreshPointPositions({ updateMasks: true })
      }, {name: "respondToCasesChange"}, dataConfiguration
    )
    return () => disposer()
  }, [callMatchCirclesToData, callRefreshPointPositions, dataConfiguration, renderer])

  // respond to axis range changes (e.g. component resizing)
  useEffect(() => {
    return reaction(
      () => [layout.getAxisLength('left'), layout.getAxisLength('bottom')],
      () => {
        callRefreshPointPositions()
      }, {name: "usePlot [axis range]"}
    )
  }, [layout, callRefreshPointPositions])

  // respond to categorical axis scale domain changes (e.g. when categories are hidden)
  // This ensures the plot re-renders after the axis scale domain is updated
  useEffect(() => {
    return reaction(
      () => (["bottom", "left", "top", "rightCat"] as const)
              .map((place) => layout.getAxisMultiScale(place)?.changeCount),
      () => {
        callRefreshPointPositions({ updateMasks: true })
      }, {name: "usePlot [axis scale domain]", equals: comparer.structural}
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
  }, [dataConfiguration, dataset, refreshPointSelection])

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
  useEffect(function respondToPlotTypeChange() {
    return mstReaction(
      () => graphModel.plotType,
      () => {
        if (!renderer) return

        callMatchCirclesToData()
        callRefreshPointPositions()
      }, {name: "usePlot [plotType]"}, graphModel
    )
  }, [callMatchCirclesToData, callRefreshPointPositions, graphModel, renderer])

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
