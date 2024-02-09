import {useEffect} from "react"
import {GraphController} from "../models/graph-controller"
import {IGraphContentModel} from "../models/graph-content-model"
import {IPixiPointsRef} from "../utilities/pixi-points"

export interface IUseGraphControllerProps {
  graphController: GraphController,
  graphModel?: IGraphContentModel,
  pixiPointsRef: IPixiPointsRef
}

export const useGraphController = ({graphController, graphModel, pixiPointsRef}: IUseGraphControllerProps) => {
  useEffect(() => {
    graphModel && graphController.setProperties({graphModel, pixiPointsRef})
  }, [graphController, graphModel, pixiPointsRef])
}
