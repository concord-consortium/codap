/**
 * Graph Custom Hooks
 */
import {useEffect} from "react"
import {reaction} from "mobx"
import {onAction} from "mobx-state-tree"
import {isSelectionAction, isSetCaseValuesAction} from "../../../data-model/data-set-actions"
import {IDataSet} from "../../../data-model/data-set"
import {IAxisModel, INumericAxisModel} from "../models/axis-model"
import {GraphLayout} from "../models/graph-layout"
import {useCurrent} from "../../../hooks/use-current";

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
  layout: GraphLayout
  refreshPointPositions:(selectedOnly: boolean) => void
  refreshPointSelection: () => void
  enableAnimation:  React.MutableRefObject<boolean>
}

export const usePlotResponders = (props: IPlotResponderProps) => {
  const { dataset, primaryAttrID, secondaryAttrID, xAxisModel, yAxisModel, enableAnimation,
    refreshPointPositions, refreshPointSelection, layout } = props,
    xNumeric = xAxisModel as INumericAxisModel,
    yNumeric = yAxisModel as INumericAxisModel,
    refreshPointsRef = useCurrent(refreshPointPositions)

  // respond to axis domain changes (e.g. axis dragging)
  useEffect(() => {
    refreshPointsRef.current(false)
    const disposer = reaction(
      () => [xNumeric?.domain, yNumeric?.domain],
      domains => {
        refreshPointsRef.current(false)
      }
    )
    return () => disposer()
  }, [refreshPointsRef, xNumeric?.domain, yNumeric?.domain])

  // respond to axis range changes (e.g. component resizing)
  useEffect(() => {
    refreshPointsRef.current(false)
    const disposer = reaction(
      () => [layout.axisLength('left'), layout.axisLength('bottom')],
      ranges => {
        refreshPointsRef.current(false)
      }
    )
    return () => disposer()
  }, [layout, refreshPointsRef])

  // respond to selection and value changes
  useEffect(() => {
    if(dataset) {
      const disposer = onAction(dataset, action => {
        if (isSelectionAction(action)) {
          refreshPointSelection()
        } else if (isSetCaseValuesAction(action)) {
          // assumes that if we're caching then only selected cases are being updated
          refreshPointsRef.current(dataset.isCaching)
        }
      }, true)
      return () => disposer()
    }
  }, [dataset, refreshPointsRef, refreshPointSelection])

  // respond to x or y attribute id change
  useEffect(() => {
    enableAnimation.current = true
    refreshPointsRef.current(false)
  }, [refreshPointsRef, primaryAttrID, secondaryAttrID, enableAnimation])
}
