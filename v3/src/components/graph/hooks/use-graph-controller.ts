import {useEffect} from "react"
import {GraphController} from "../models/graph-controller"
import {IGraphContentModel} from "../models/graph-content-model"
import { PointRendererArray } from "../../data-display/renderer"

export interface IUseGraphControllerProps {
  graphController: GraphController,
  graphModel?: IGraphContentModel,
  rendererArray: PointRendererArray
}

export const useGraphController = ({graphController, graphModel, rendererArray}: IUseGraphControllerProps) => {
  useEffect(() => {
    const renderer = rendererArray[0]
    graphModel && renderer && graphController.setProperties(graphModel, renderer)
  }, [graphController, graphModel, rendererArray])
}
