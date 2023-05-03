import {useEffect} from "react"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {IDotsRef} from "../graphing-types"
import {GraphController} from "../models/graph-controller"
import {IGraphModel} from "../models/graph-model"

export interface IUseGraphControllerProps {
  graphController: GraphController,
  graphModel?: IGraphModel,
  dotsRef: IDotsRef
}

export const useGraphController = ({graphController, graphModel, dotsRef}: IUseGraphControllerProps) => {
  const dataset = useDataSetContext()

  useEffect(() => {
    graphModel && graphController.setProperties({graphModel, dataset, dotsRef})
  }, [graphController, graphModel, dataset, dotsRef])
}
