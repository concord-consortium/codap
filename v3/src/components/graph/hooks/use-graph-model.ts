import {MutableRefObject, RefObject, useCallback, useEffect} from "react"
import {onAction} from "mobx-state-tree"
import {matchCirclesToData, setNiceDomain} from "../utilities/graph_utils"
import {IGraphModel} from "../models/graph-model"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {INumericAxisModel} from "../models/axis-model"

interface IProps {
  graphModel: IGraphModel
  enableAnimation: MutableRefObject<boolean>
  casesRef:  MutableRefObject<string[]>
  dotsRef: RefObject<SVGSVGElement>
  instanceId: string | undefined
}



export function useGraphModel(props:IProps) {
  const {graphModel, enableAnimation, casesRef, dotsRef, instanceId} = props,
    yAxisModel = graphModel.getAxis('left'),
    xAttrID = graphModel.getAttributeID('bottom'),
    yAttrID = graphModel.getAttributeID('left'),
    dataset = useDataSetContext()

  const callMatchCirclesToData = useCallback(() => {
    matchCirclesToData({
      caseIDs: casesRef.current,
      dotsElement: dotsRef.current,
      enableAnimation, instanceId
    })
  }, [instanceId, casesRef, dotsRef, enableAnimation])

  useEffect(function createCircles() {
      callMatchCirclesToData()
  }, [callMatchCirclesToData])

  // respond to change in plotType
  useEffect(function installPlotTypeAction() {
    const disposer = onAction(graphModel, action => {
      if (action.name === 'setPlotType') {
        const newPlotType = action.args?.[0]/*,
          attrIDs = newPlotType === 'dotPlot' ? [xAttrID] : [xAttrID, yAttrID]*/
        enableAnimation.current = true
        // In case the y-values have changed we rescale
        if( newPlotType === 'scatterPlot') {
          const values = casesRef.current.map(anID => dataset?.getNumeric(anID, yAttrID)) as number[]
          setNiceDomain(values || [], yAxisModel as INumericAxisModel)
        }
      }
    }, true)
    return () => disposer()
  }, [dataset, callMatchCirclesToData, casesRef, enableAnimation, graphModel, xAttrID, yAttrID, yAxisModel])

}

