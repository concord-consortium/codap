import {useCallback, useEffect} from "react"
import {IGraphModel} from "../models/graph-model"
import {useGraphLayoutContext} from "../models/graph-layout"
import {IMovableLineModel, IMovableValueModel} from "../adornments/adornment-models"
import {onAction} from "mobx-state-tree"

interface IProps {
  graphModel: IGraphModel
  movableLineModel: IMovableLineModel
  movableValueModel: IMovableValueModel
}

export function useMovables(props:IProps) {
  const {graphModel, movableValueModel, movableLineModel} = props,
    layout = useGraphLayoutContext(),
    xScale = layout.axisScale('bottom'),
    yScale = layout.axisScale('left'),
    xDomainDelta = xScale.domain()[1] - xScale.domain()[0],
    yDomainDelta = yScale.domain()[1] - yScale.domain()[0]

  const updateMovables = useCallback(() => {
    movableLineModel.setLine({intercept: yScale.domain()[0] + yDomainDelta / 3, slope: yDomainDelta / xDomainDelta})
    movableValueModel.setValue(xScale.domain()[0] + xDomainDelta / 3)
  }, [xScale, yScale, movableLineModel, movableValueModel, xDomainDelta, yDomainDelta])

  useEffect(function initMovables() {
    updateMovables()
  }, [updateMovables])

  // respond to change in plotType or attribute id
  useEffect(function installPlotTypeAction() {
    const disposer = graphModel && onAction(graphModel, action => {
      if (action.name === 'setAttributeID') {
        updateMovables()
      }
    }, true)
    return () => disposer?.()
  }, [updateMovables, graphModel])
}

