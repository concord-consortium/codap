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
  xAttrID?: string
  yAttrID?: string
  layout: GraphLayout
  refreshPointPositions:(selectedOnly: boolean) => void
  refreshPointSelection: () => void
  enableAnimation:  React.MutableRefObject<boolean>
}

export const usePlotResponders = (props: IPlotResponderProps) => {
  const { dataset, xAttrID, yAttrID, xAxisModel, yAxisModel, enableAnimation,
    refreshPointPositions, refreshPointSelection, layout } = props,
    xNumeric = xAxisModel as INumericAxisModel,
    yNumeric = yAxisModel as INumericAxisModel

  // respond to axis domain changes (e.g. axis dragging)
  useEffect(() => {
    refreshPointPositions(false)
    const disposer = reaction(
      () => [xNumeric?.domain, yNumeric?.domain],
      domains => {
        refreshPointPositions(false)
      }
    )
    return () => disposer()
  }, [refreshPointPositions, xNumeric?.domain, yNumeric?.domain])

  // respond to axis range changes (e.g. component resizing)
  useEffect(() => {
    refreshPointPositions(false)
    const disposer = reaction(
      () => [layout.axisLength('left'), layout.axisLength('bottom')],
      ranges => {
        refreshPointPositions(false)
      }
    )
    return () => disposer()
  }, [layout, refreshPointPositions])

  // respond to selection and value changes
  useEffect(() => {
    if(dataset) {
      const disposer = onAction(dataset, action => {
        if (isSelectionAction(action)) {
          refreshPointSelection()
        } else if (isSetCaseValuesAction(action)) {
          // assumes that if we're caching then only selected cases are being updated
          refreshPointPositions(dataset.isCaching)
        }
      }, true)
      return () => disposer()
    }
  }, [dataset, refreshPointPositions, refreshPointSelection])

  // respond to x or y attribute id change
  useEffect(() => {
    enableAnimation.current = true
    refreshPointPositions(false)
  }, [refreshPointPositions, xAttrID, yAttrID, enableAnimation])
}
