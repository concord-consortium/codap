/**
 * Graph Custom Hooks
 */
import {debounce} from "lodash"
import {useCallback, useEffect} from "react"
import {reaction} from "mobx"
import {onAction} from "mobx-state-tree"
import {isSelectionAction, isSetCaseValuesAction} from "../../../data-model/data-set-actions"
import {IDataSet} from "../../../data-model/data-set"
import {IAxisModel, INumericAxisModel} from "../models/axis-model"
import {GraphLayout} from "../models/graph-layout"
import {useCurrent} from "../../../hooks/use-current"

interface IDragHandlers {
  start: (event: MouseEvent) => void
  drag: (event: MouseEvent) => void
  end: (event: MouseEvent) => void
}

export const useDragHandlers = (target: any, {start, drag, end}: IDragHandlers) => {
  useEffect(() => {
    target.addEventListener('mousedown', start)
    target.addEventListener('mousemove', drag)
    target.addEventListener('mouseup', end)
    // On cleanup, remove event listeners
    return () => {
      target.removeEventListener('mousedown', start)
      target.removeEventListener('mousemove', drag)
      target.removeEventListener('mouseup', end)
    }
  }, [target, start, drag, end])
}

export interface IPlotResponderProps {
  dataset:IDataSet | undefined
  xAxisModel?:IAxisModel
  yAxisModel?:IAxisModel
  primaryAttrID?: string
  secondaryAttrID?: string
  legendAttrID?: string
  layout: GraphLayout
  refreshPointPositions:(selectedOnly: boolean) => void
  refreshPointSelection: () => void
  enableAnimation:  React.MutableRefObject<boolean>
}

export const usePlotResponders = (props: IPlotResponderProps) => {
  const { dataset, primaryAttrID, secondaryAttrID, legendAttrID, xAxisModel, yAxisModel, enableAnimation,
    refreshPointPositions, refreshPointSelection, layout } = props,
    xNumeric = xAxisModel as INumericAxisModel,
    yNumeric = yAxisModel as INumericAxisModel,
    refreshPointsRef = useCurrent(refreshPointPositions)

  /* This routine is frequently called many times in a row when something about the graph changes that requires
  * refreshing the plot's point positions. That, by itself, would be a reason to use debounce to ensure that
  * the actual refreshPointPositions function is only called once. But another, even more important reason is
  * that there is no guarantee that when callRefreshPointPositions is invoked, the d3 points in the plot
  * have been synched with the data configuration's notion of which cases are plottable. Delaying the actual
  * plotting of points until the next event cycle ensures that the data configuration's filter process will
  * have had a chance to take place. */
  const callRefreshPointPositions = useCallback((selectedOnly:boolean) => {
    console.log('in callback')
    debounce(() => {
      console.log('in debounce')
      refreshPointsRef.current(selectedOnly)
    }, 10)
  }, [refreshPointsRef])

  // respond to axis domain changes (e.g. axis dragging)
  useEffect(() => {
    callRefreshPointPositions(false)
    const disposer = reaction(
      () => [xNumeric?.domain, yNumeric?.domain],
      domains => {
        callRefreshPointPositions(false)
      }
    )
    return () => disposer()
  }, [callRefreshPointPositions, xNumeric?.domain, yNumeric?.domain])

  // respond to axis range changes (e.g. component resizing)
  useEffect(() => {
    callRefreshPointPositions(false)
    const disposer = reaction(
      () => [layout.axisLength('left'), layout.axisLength('bottom')],
      ranges => {
        callRefreshPointPositions(false)
      }
    )
    return () => disposer()
  }, [layout, callRefreshPointPositions])

  // respond to selection and value changes
  useEffect(() => {
    if(dataset) {
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

  // respond to x, y or legend attribute id change
  useEffect(() => {
    enableAnimation.current = true
    callRefreshPointPositions(false)
  }, [callRefreshPointPositions, primaryAttrID, secondaryAttrID, legendAttrID, enableAnimation])
}
