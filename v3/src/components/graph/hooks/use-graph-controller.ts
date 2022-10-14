import {useRef, useEffect} from "react"
import { GraphController } from "../models/graph-controller"

export interface IUseGraphController {
  graphModel: any,
  dataset: any,
  layout: any,
  enableAnimation: any,
  instanceId: any,
  dotsRef: any,
  v2Document: any
}

export const useGraphController = ({
  graphModel,
  dataset,
  layout,
  enableAnimation,
  instanceId,
  dotsRef,
  v2Document
}: IUseGraphController) => {
  const graphController = useRef<GraphController>()

  const getNewGraphController = () => {
    return new GraphController({
      graphModel,
      dataset, layout, enableAnimation, instanceId, dotsRef, v2Document
    })
  }

  useEffect(() => {
    graphController.current = getNewGraphController()
  },[dataset, layout, instanceId, v2Document])

  return graphController
}


