import {useEffect} from "react"
import {IDotsRef} from "../../data-display/data-display-types"
import {GraphController} from "../models/graph-controller"
import {IGraphContentModel} from "../models/graph-content-model"

export interface IUseGraphControllerProps {
  graphController: GraphController,
  graphContentModel?: IGraphContentModel,
  dotsRef: IDotsRef
}

export const useGraphController = ({graphController, graphContentModel, dotsRef}: IUseGraphControllerProps) => {
  useEffect(() => {
    graphContentModel && graphController.setProperties({graphContentModel, dotsRef})
  }, [graphController, graphContentModel, dotsRef])
}
