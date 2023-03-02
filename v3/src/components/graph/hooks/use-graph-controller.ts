import {useEffect} from "react"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {useV2DocumentContext} from "../../../hooks/use-v2-document-context"
import {GraphController} from "../models/graph-controller"
import {IGraphModel} from "../models/graph-model"

export interface IUseGraphControllerProps {
  graphController: GraphController,
  graphModel: IGraphModel,
}

export const useGraphController = ({graphController, graphModel}: IUseGraphControllerProps) => {
  const v2Document = useV2DocumentContext()
  const dataset = useDataSetContext()

  useEffect(() => {
    v2Document && graphController.processV2Document(v2Document)
  }, [graphController, v2Document])

  useEffect(() => {
    graphController.setProperties({graphModel, dataset})
  }, [graphController, graphModel, dataset])
}
