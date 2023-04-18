import React, {useCallback, useEffect, useRef} from "react"
import {autorun, reaction} from "mobx"
import {onAction} from "mobx-state-tree"
import {isSelectionAction, isSetCaseValuesAction} from "../../../models/data/data-set-actions"
import {INumericAxisModel} from "../../axis/models/axis-model"
import {GraphLayout} from "../models/graph-layout"
import {IGraphModel} from "../models/graph-model"
import {matchCirclesToData, startAnimation} from "../utilities/graph-utils"
import {useInstanceIdContext} from "../../../hooks/use-instance-id-context"
import {useDataSetContext} from "../../../hooks/use-data-set-context"

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
  graphModel: IGraphModel
  primaryAttrID?: string
  secondaryAttrID?: string
  legendAttrID?: string
  layout: GraphLayout
  refreshPointPositions: (selectedOnly: boolean) => void
  refreshPointSelection: () => void
  dotsRef: React.RefObject<SVGSVGElement>
  enableAnimation: React.MutableRefObject<boolean>
}

export const usePlotResponders = (props: IPlotResponderProps) => {
  const {
      graphModel, primaryAttrID, secondaryAttrID, legendAttrID, enableAnimation,
      refreshPointPositions, refreshPointSelection, dotsRef, layout
    } = props,
    dataset = useDataSetContext(),
    // numberOfScales = layout.axisScales.entries().size(),
    xNumeric = graphModel.getAxis('bottom') as INumericAxisModel,
    yNumeric = graphModel.getAxis('left') as INumericAxisModel,
    v2Numeric = graphModel.getAxis('rightNumeric') as INumericAxisModel,
    instanceId = useInstanceIdContext()

  /* This routine is frequently called many times in a row when something about the graph changes that requires
  * refreshing the plot's point positions. That, by itself, would be a reason to ensure that
  * the actual refreshPointPositions function is only called once. But another, even more important reason is
  * that there is no guarantee that when callRefreshPointPositions is invoked, the d3 points in the plot
  * have been synched with the data configuration's notion of which cases are plottable. Delaying the actual
  * plotting of points until the next event cycle ensures that the data configuration's filter process will
  * have had a chance to take place. */
  const timer = useRef<any>()
  const callRefreshPointPositions = useCallback((selectedOnly: boolean) => {
    if (timer.current) {
      return
    }
    timer.current = setTimeout(() => {
      refreshPointPositions(selectedOnly)
      timer.current = null
    }, 10)
  }, [refreshPointPositions])

  useEffect(function doneWithTimer() {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current)
      }
    }
  }, [])

  // respond to axis domain changes (e.g. axis dragging)
  useEffect(() => {
    const disposer = reaction(
      () => [xNumeric?.domain, yNumeric?.domain, v2Numeric?.domain],
      () => {
        callRefreshPointPositions(false)
      }, {fireImmediately: true}
    )
    return () => disposer()
  }, [callRefreshPointPositions, xNumeric?.domain, yNumeric?.domain, v2Numeric?.domain])

  // respond to axis range changes (e.g. component resizing)
  useEffect(() => {
    const disposer = reaction(
      () => [layout.getAxisLength('left'), layout.getAxisLength('bottom')],
      () => {
        callRefreshPointPositions(false)
      }
    )
    return () => disposer()
  }, [layout, callRefreshPointPositions])

  // respond to selection and value changes
  useEffect(() => {
    if (dataset) {
      const disposer = onAction(dataset, action => {
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
      }, true)
      return () => disposer()
    }
  }, [dataset, callRefreshPointPositions, refreshPointSelection])

  // respond to dataset, x, y or legend attribute id change
  useEffect(() => {
    startAnimation(enableAnimation)
    callRefreshPointPositions(false)
  }, [callRefreshPointPositions, primaryAttrID, secondaryAttrID, legendAttrID, enableAnimation])

  // respond to added or removed cases and change in attribute type
  useEffect(function handleAddRemoveCases() {
    const dataConfiguration = graphModel.config
    const disposer = dataConfiguration.onAction(action => {
      if (['addCases', 'removeCases', 'setAttributeType'].includes(action.name)) {
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
    })
    return () => disposer()
  }, [dataset, enableAnimation, graphModel, callRefreshPointPositions, dotsRef, instanceId])

  // respond to pointsNeedUpdating becoming false; that is when the points have been updated
  // Happens when the number of plots has changed for now. Possibly other situations in the future.
  useEffect(() => {
    return autorun(
      () => {
        !graphModel.config?.pointsNeedUpdating && callRefreshPointPositions(false)
      })
  }, [graphModel, callRefreshPointPositions])



}
