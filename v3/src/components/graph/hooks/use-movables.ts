import {useCallback, useEffect} from "react"
import {ScaleNumericBaseType} from "../../axis/axis-types"
import {useGraphLayoutContext} from "../models/graph-layout"
import {useGraphModelContext} from "../models/graph-model"
import {onAnyAction} from "../../../utilities/mst-utils"
import { IMovableLineModel } from "../adornments/movable-line/movable-line-model"
import { IMovableValueModel } from "../adornments/movable-value/movable-value-model"

interface IProps {
  movableLineModel: IMovableLineModel
  movableValueModel: IMovableValueModel
}

export function useMovables(props: IProps) {
  const { movableValueModel, movableLineModel} = props,
    graphModel = useGraphModelContext(),
    layout = useGraphLayoutContext(),
    xScale = layout.getAxisScale('bottom') as ScaleNumericBaseType,
    yScale = layout.getAxisScale('left') as ScaleNumericBaseType

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
    const disposer = graphModel && onAnyAction(graphModel, action => {
        switch (action.name) {
          case 'setAttributeID':
          case 'setCases':
            updateMovables()
        }
      })
    return () => disposer?.()
  }, [updateMovables, graphModel])
}
