import {useRef, useEffect, useContext} from "react"
import {InstanceIdContext} from "../../../hooks/use-instance-id-context"
import {GraphController} from "../models/graph-controller"
import {GraphLayout} from "../models/graph-layout"
import {CodapV2Document} from "../../../v2/codap-v2-document"
import {IGraphModel} from "../models/graph-model"
import {IDataSet} from "../../../data-model/data-set"

export interface IUseGraphControllerProps {
  graphModel: IGraphModel,
  layout: GraphLayout,
  dataset: IDataSet | undefined,
  enableAnimation: React.MutableRefObject<boolean>
  dotsRef: React.RefObject<SVGSVGElement>
  v2Document?: CodapV2Document
}

export const useGraphController = ({
  graphModel, layout, dataset, enableAnimation, dotsRef, v2Document
}: IUseGraphControllerProps) => {
  const graphControllerRef = useRef<GraphController>()
  const instanceId = useContext(InstanceIdContext) as string

  useEffect(() => {
    graphControllerRef.current = new GraphController({
      graphModel, layout, dataset, enableAnimation, instanceId, dotsRef, v2Document
    })
  },[dataset, layout, instanceId, v2Document, dotsRef, enableAnimation, graphModel])

  return graphControllerRef
}
