import {useEffect} from "react"
import {IDotsRef, IPixiPointsRef} from "../../data-display/data-display-types"
import {GraphController} from "../models/graph-controller"
import {IGraphContentModel} from "../models/graph-content-model"

export interface IUseGraphControllerProps {
  graphController: GraphController,
  graphModel?: IGraphContentModel,
  dotsRef: IDotsRef
  pixiPointsRef: IPixiPointsRef
}

export const useGraphController = ({graphController, graphModel, dotsRef, pixiPointsRef}: IUseGraphControllerProps) => {
  useEffect(() => {
    graphModel && graphController.setProperties({graphModel, dotsRef, pixiPointsRef})
  }, [graphController, graphModel, dotsRef, pixiPointsRef])
}
