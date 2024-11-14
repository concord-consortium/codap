import {useEffect} from "react"
import {GraphController} from "../models/graph-controller"
import {IGraphContentModel} from "../models/graph-content-model"
import {PixiPointsArray} from "../../data-display/pixi/pixi-points"

export interface IUseGraphControllerProps {
  graphController: GraphController,
  graphModel?: IGraphContentModel,
  pixiPointsArray: PixiPointsArray
}

export const useGraphController = ({graphController, graphModel, pixiPointsArray}: IUseGraphControllerProps) => {
  useEffect(() => {
    const pixiPoints = pixiPointsArray[0]
    graphModel && pixiPoints && graphController.setProperties(graphModel, pixiPoints)
  }, [graphController, graphModel, pixiPointsArray])
}
