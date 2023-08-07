import {useEffect} from "react"
import {IDotsRef} from "../../data-display/data-display-types"
import {GraphController} from "../models/graph-controller"
import {IGraphContentModel} from "../models/graph-content-model"

export interface IUseGraphControllerProps {
  graphController: GraphController,
  graphModel?: IGraphContentModel,
  dotsRef: IDotsRef
}

export const useGraphController = ({graphController, graphModel, dotsRef}: IUseGraphControllerProps) => {
  useEffect(() => {
    graphModel && graphController.setProperties({graphModel, dotsRef})
  }, [graphController, graphModel, dotsRef])
}
