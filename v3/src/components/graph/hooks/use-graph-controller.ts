import {useEffect} from "react"
import {GraphController} from "../models/graph-controller"
import {IGraphContentModel} from "../models/graph-content-model"
import {IPixiPointsArrayRef} from "../utilities/pixi-points"

export interface IUseGraphControllerProps {
  graphController: GraphController,
  graphModel?: IGraphContentModel,
  pixiPointsArrayRef: IPixiPointsArrayRef
}

export const useGraphController = ({graphController, graphModel, pixiPointsArrayRef}: IUseGraphControllerProps) => {
  useEffect(() => {
    graphModel && graphController.setProperties({graphModel, pixiPointsArrayRef})
  }, [graphController, graphModel, pixiPointsArrayRef])
}
