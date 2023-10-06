import {useCallback, useEffect} from "react"
import {ScaleNumericBaseType} from "../../axis/axis-types"
import {useGraphLayoutContext} from "../models/graph-layout"
import {onAnyAction} from "../../../utilities/mst-utils"
import { IMovableLineAdornmentModel } from "../adornments/movable-line/movable-line-adornment-model"
import { IMovableValueAdornmentModel } from "../adornments/movable-value/movable-value-adornment-model"
import { useGraphContentModelContext } from "./use-graph-content-model-context"

interface IProps {
  movableLineModel: IMovableLineAdornmentModel
  movableValueModel: IMovableValueAdornmentModel
}

export function useMovables(props: IProps) {
  const { movableValueModel, movableLineModel} = props,
    graphModel = useGraphContentModelContext(),
    layout = useGraphLayoutContext(),
    xScale = layout.getAxisScale('bottom') as ScaleNumericBaseType,
    yScale = layout.getAxisScale('left') as ScaleNumericBaseType

  const updateMovables = useCallback(() => {
    const xDomainDelta = xScale.domain()[1] - xScale.domain()[0],
      yDomainDelta = yScale.domain()[1] - yScale.domain()[0]
    movableLineModel.setLine({intercept: yScale.domain()[0] + yDomainDelta / 3, slope: yDomainDelta / xDomainDelta,
      pivot1:undefined, pivot2:undefined})
    movableValueModel.addValue(xScale.domain()[0] + xDomainDelta / 3)
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
