import {useEffect} from "react"
import {IDotsRef} from "../graphing-types"
import {GraphController} from "../models/graph-controller"
import {IGraphModel} from "../models/graph-model"

export interface IUseGraphControllerProps {
  graphController: GraphController,
  graphModel?: IGraphModel,
  dotsRef: IDotsRef
}

export const useGraphController = ({graphController, graphModel, dotsRef}: IUseGraphControllerProps) => {
  useEffect(() => {
    graphModel && graphController.setProperties({graphModel, dotsRef})
  }, [graphController, graphModel, dotsRef])
}
