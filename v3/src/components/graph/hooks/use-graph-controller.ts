import {useEffect} from "react"
import {GraphController} from "../models/graph-controller"
import {IGraphContentModel} from "../models/graph-content-model"
import { PixiPointsCompatibleArray } from "../../data-display/renderer"

export interface IUseGraphControllerProps {
  graphController: GraphController,
  graphModel?: IGraphContentModel,
  pixiPointsArray: PixiPointsCompatibleArray
}

export const useGraphController = ({graphController, graphModel, pixiPointsArray}: IUseGraphControllerProps) => {
  useEffect(() => {
    const pixiPoints = pixiPointsArray[0]
    graphModel && pixiPoints && graphController.setProperties(graphModel, pixiPoints)
  }, [graphController, graphModel, pixiPointsArray])
}
