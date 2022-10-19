import {useRef, useEffect, useContext} from "react"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {InstanceIdContext} from "../../../hooks/use-instance-id-context"
import {useV2DocumentContext} from "../../../hooks/use-v2-document-context"
import {GraphController} from "../models/graph-controller"
import {useGraphLayoutContext} from "../models/graph-layout"
import {IGraphModel} from "../models/graph-model"

export interface IUseGraphControllerProps {
  graphModel: IGraphModel,
  enableAnimation: React.MutableRefObject<boolean>
  dotsRef: React.RefObject<SVGSVGElement>
}

export const useGraphController = ({ graphModel, enableAnimation, dotsRef }: IUseGraphControllerProps) => {
  const v2Document = useV2DocumentContext()
  const dataset = useDataSetContext()
  const layout = useGraphLayoutContext()
  const graphControllerRef = useRef<GraphController>()
  const instanceId = useContext(InstanceIdContext) as string

  useEffect(() => {
    graphControllerRef.current = new GraphController({
      graphModel, layout, dataset, enableAnimation, instanceId, dotsRef, v2Document
    })
  }, [graphModel, layout, dataset, enableAnimation, instanceId, dotsRef, v2Document])

  return graphControllerRef.current
}
