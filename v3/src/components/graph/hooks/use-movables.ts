import {useCallback, useEffect} from "react"
import {IGraphModel} from "../models/graph-model"
import {ScaleNumericBaseType, useGraphLayoutContext} from "../models/graph-layout"
import {IMovableLineModel, IMovableValueModel} from "../adornments/adornment-models"
import {onAction} from "mobx-state-tree"

interface IProps {
  graphModel: IGraphModel
  movableLineModel: IMovableLineModel
  movableValueModel: IMovableValueModel
}

export function useMovables(props: IProps) {
  const {graphModel, movableValueModel, movableLineModel} = props,
    layout = useGraphLayoutContext(),
    xScale = layout.axisScale('bottom') as ScaleNumericBaseType,
    yScale = layout.axisScale('left') as ScaleNumericBaseType

  const updateMovables = useCallback(() => {
    const xDomainDelta = xScale.domain()[1] - xScale.domain()[0],
      yDomainDelta = yScale.domain()[1] - yScale.domain()[0]
    movableLineModel.setLine({intercept: yScale.domain()[0] + yDomainDelta / 3, slope: yDomainDelta / xDomainDelta,
      pivot1:undefined, pivot2:undefined})
    movableValueModel.setValue(xScale.domain()[0] + xDomainDelta / 3)
  }, [xScale, yScale, movableLineModel, movableValueModel])

  useEffect(function initMovables() {
    updateMovables()
  }, [updateMovables])

  // respond to change in attribute id
  useEffect(function installActionResponse() {
    const disposer = graphModel && onAction(graphModel, action => {
        switch (action.name) {
          case 'setAttributeID':
          case 'setCases':
            updateMovables()
        }
      }, true)
    return () => disposer?.()
  }, [updateMovables, graphModel])
}

