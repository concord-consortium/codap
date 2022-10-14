import {useRef, useEffect} from "react"
import {GraphController, IGraphControllerProps} from "../models/graph-controller"

export const useGraphController = ({
  graphModel, dataset, layout, enableAnimation, instanceId, dotsRef, v2Document
}: IGraphControllerProps) => {
  const graphController = useRef<GraphController>()

  const getNewGraphController = () => {
    return new GraphController({
      graphModel,dataset, layout, enableAnimation, instanceId, dotsRef, v2Document
    })
  }

  useEffect(() => {
    graphController.current = getNewGraphController()
  },[dataset, layout, instanceId, v2Document])

  return graphController
}
