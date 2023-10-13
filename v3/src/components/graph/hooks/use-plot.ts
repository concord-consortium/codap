import React, {useCallback, useEffect, useRef} from "react"
import {autorun, reaction} from "mobx"
import {isAlive} from "mobx-state-tree"
import {isSelectionAction, isSetCaseValuesAction} from "../../../models/data/data-set-actions"
import {IDotsRef} from "../../data-display/data-display-types"
import {useGraphContentModelContext} from "./use-graph-content-model-context"
import {GraphAttrRoles} from "../graphing-types"
import {IAxisModel} from "../../axis/models/axis-model"
import {useGraphLayoutContext} from "../models/graph-layout"
import {matchCirclesToData, startAnimation} from "../utilities/graph-utils"
import {useCurrent} from "../../../hooks/use-current"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {mstReaction} from "../../../utilities/mst-reaction"
import {onAnyAction} from "../../../utilities/mst-utils"

interface IDragHandlers {
  start: (event: MouseEvent) => void
  drag: (event: MouseEvent) => void
  end: (event: MouseEvent) => void
}

export const useDragHandlers = (target: any, {start, drag, end}: IDragHandlers) => {
  useEffect(() => {
    if (target) {
      target.addEventListener('mousedown', start)
      target.addEventListener('mousemove', drag)
      target.addEventListener('mouseup', end)
      // On cleanup, remove event listeners
      return () => {
        target.removeEventListener('mousedown', start)
        target.removeEventListener('mousemove', drag)
        target.removeEventListener('mouseup', end)
      }
    }
  }, [target, start, drag, end])
}

export interface IPlotResponderProps {
  refreshPointPositions: (selectedOnly: boolean) => void
  refreshPointSelection: () => void
  dotsRef: IDotsRef
  enableAnimation: React.MutableRefObject<boolean>
}

function isDefunctAxisModel(axisModel?: IAxisModel) {
  return axisModel && !isAlive(axisModel)
}

export const usePlotResponders = (props: IPlotResponderProps) => {
  const {enableAnimation, refreshPointPositions, refreshPointSelection, dotsRef} = props,
    graphModel = useGraphContentModelContext(),
    layout = useGraphLayoutContext(),
    dataConfiguration = graphModel.dataConfiguration,
    dataset = dataConfiguration?.dataset,
    instanceId = useInstanceIdContext(),
    refreshPointPositionsRef = useCurrent(refreshPointPositions)

  /* This routine is frequently called many times in a row when something about the graph changes that requires
  * refreshing the plot's point positions. That, by itself, would be a reason to ensure that
  * the actual refreshPointPositions function is only called once. But another, even more important reason is
  * that there is no guarantee that when callRefreshPointPositions is invoked, the d3 points in the plot
  * have been synced with the data configuration's notion of which cases are plottable. Delaying the actual
  * plotting of points until the next event cycle ensures that the data configuration's filter process will
  * have had a chance to take place. */
  const timer = useRef<any>()
  const callRefreshPointPositions = useCallback((selectedOnly: boolean) => {
    if (timer.current) {
      return
    }
    timer.current = setTimeout(() => {
      refreshPointPositionsRef.current(selectedOnly)
      timer.current = null
    }, 10)
    return () => {
      if (timer.current) {
        clearTimeout(timer.current)
        timer.current = null
      }
    }
  }, [refreshPointPositionsRef])

  useEffect(function doneWithTimer() {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current)
      }
    }
  }, [])

  // respond to numeric axis domain changes (e.g. axis dragging)
  useEffect(() => {
    const disposer = reaction(
      () => {
        const xNumeric = graphModel.getNumericAxis('bottom')
        const yNumeric = graphModel.getNumericAxis('left')
        const v2Numeric = graphModel.getNumericAxis('rightNumeric')
        if (isDefunctAxisModel(xNumeric) || isDefunctAxisModel(yNumeric) || isDefunctAxisModel(v2Numeric)) {
          console.warn("usePlot numeric domains reaction skipped for defunct axis model(s)")
          return
        }
        const { domain: xDomain } = xNumeric || {}
        const { domain: yDomain } = yNumeric || {}
        const { domain: v2Domain } = v2Numeric || {}
        return [xDomain, yDomain, v2Domain]
      },
      () => {
        callRefreshPointPositions(false)
      }, {name: "usePlot [numeric domains]", fireImmediately: true}
    )
    return () => disposer()
  }, [callRefreshPointPositions, graphModel])

  useEffect(function respondToCategorySetChanges() {
    return reaction(() => {
      return layout.categorySetArrays
    }, (categorySetsArrays) => {
      if (categorySetsArrays.length) {
        startAnimation(enableAnimation)
        callRefreshPointPositions(false)
      }
    }, { name: "usePlot.respondToCategorySetChanges" })
  }, [callRefreshPointPositions, enableAnimation, layout.categorySetArrays])

  // respond to attribute assignment changes
  useEffect(() => {
    const disposer = mstReaction(
      () => GraphAttrRoles.map((aRole) => dataConfiguration?.attributeID(aRole)),
      () => {
        startAnimation(enableAnimation)
        callRefreshPointPositions(false)
      }, { name: "usePlot [attribute assignment]" }, dataConfiguration
    )
    return () => disposer()
  }, [callRefreshPointPositions, dataConfiguration, enableAnimation])

  // respond to axis range changes (e.g. component resizing)
  useEffect(() => {
    const disposer = reaction(
      () => [layout.getAxisLength('left'), layout.getAxisLength('bottom')],
      () => {
        callRefreshPointPositions(false)
      }, { name: "usePlot [axis range]" }
    )
    return () => disposer()
  }, [layout, callRefreshPointPositions])

  // respond to selection and value changes
  useEffect(() => {
    if (dataset) {
      const disposer = onAnyAction(dataset, action => {
        if (isSelectionAction(action)) {
          refreshPointSelection()
        } else if (isSetCaseValuesAction(action)) {
          // assumes that if we're caching then only selected cases are being updated
          callRefreshPointPositions(dataset.isCaching)
          // TODO: handling of add/remove cases was added specifically for the case plot.
          // Bill has expressed a desire to refactor the case plot to behave more like the
          // other plots, which already handle removal of cases (and perhaps addition of cases?)
          // without this. Should check to see whether this is necessary down the road.
        } else if (["addCases", "removeCases"].includes(action.name)) {
          callRefreshPointPositions(false)
        }
      })
      return () => disposer()
    }
  }, [dataset, callRefreshPointPositions, refreshPointSelection])

  // respond to added or removed cases or change in attribute type or change in collection groups
  useEffect(function handleDataConfigurationActions() {
    const disposer = dataConfiguration?.onAction(action => {
      if (['addCases', 'removeCases', 'setAttributeType', 'invalidateCollectionGroups'].includes(action.name)) {
        matchCirclesToData({
          dataConfiguration,
          pointRadius: graphModel.getPointRadius(),
          pointColor: graphModel.pointColor,
          pointStrokeColor: graphModel.pointStrokeColor,
          dotsElement: dotsRef.current,
          enableAnimation, instanceId
        })
        callRefreshPointPositions(false)
      }
    }) || (() => true)
    return () => disposer()
  }, [dataset, dataConfiguration, enableAnimation, graphModel, callRefreshPointPositions, dotsRef, instanceId])

  // respond to pointsNeedUpdating becoming false; that is when the points have been updated
  // Happens when the number of plots has changed for now. Possibly other situations in the future.
  useEffect(() => {
    return autorun(
      () => {
        !graphModel.dataConfiguration.pointsNeedUpdating && callRefreshPointPositions(false)
      }, { name: "usePlot [callRefreshPointPositions]" })
  }, [graphModel, callRefreshPointPositions])

}
