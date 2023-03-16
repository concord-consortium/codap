import {useEffect} from "react"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {GraphController} from "../models/graph-controller"
import {IGraphModel} from "../models/graph-model"

export interface IUseGraphControllerProps {
  graphController: GraphController,
  graphModel?: IGraphModel,
}

export const useGraphController = ({graphController, graphModel}: IUseGraphControllerProps) => {
  const dataset = useDataSetContext()

  useEffect(() => {
    graphModel && graphController.setProperties({graphModel, dataset})
  }, [graphController, graphModel, dataset])
}
