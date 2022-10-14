import {useRef, useEffect} from "react"
import {GraphController, IGraphControllerProps} from "../models/graph-controller"

export const useGraphController = ({
  graphModel, dataset, layout, enableAnimation, instanceId, dotsRef, v2Document
}: IGraphControllerProps) => {
  const graphController = useRef<GraphController>()

  useEffect(() => {
    graphController.current = new GraphController({
      graphModel,dataset, layout, enableAnimation, instanceId, dotsRef, v2Document
    })
  },[dataset, layout, instanceId, v2Document])

  return graphController
}
