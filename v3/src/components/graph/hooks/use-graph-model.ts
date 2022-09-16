import {MutableRefObject, RefObject, useCallback, useEffect} from "react"
import {onAction} from "mobx-state-tree"
import {filterCases, matchCirclesToData, setNiceDomain} from "../utilities/graph_utils"
import {IGraphModel} from "../models/graph-model"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {INumericAxisModel} from "../models/axis-model"

interface IProps {
  graphModel: IGraphModel
  enableAnimation: MutableRefObject<boolean>
  casesRef:  MutableRefObject<string[]>
  dotsRef: RefObject<SVGSVGElement>
  instanceId: string | undefined,
  keyFunc: (d: string) => string
}



export function useGraphModel(props:IProps) {
  const {graphModel, enableAnimation, casesRef, dotsRef, keyFunc, instanceId} = props,
    plotType = graphModel.plotType,
    yAxisModel = graphModel.getAxis('left'),
    xAttrID = graphModel.getAttributeID('bottom'),
    yAttrID = graphModel.getAttributeID('left'),
    dataset = useDataSetContext()

  const callMatchCirclesToData = useCallback(() => {
    matchCirclesToData({
      caseIDs: casesRef.current, dataset,
      dotsElement: dotsRef.current,
      enableAnimation, keyFunc, instanceId, xAttrID, yAttrID
    })
  }, [dataset, keyFunc, instanceId, xAttrID, yAttrID, casesRef, dotsRef, enableAnimation])

  useEffect(function createCircles() {
      callMatchCirclesToData()
  }, [callMatchCirclesToData])

  // respond to assignment of new attribute ID
  useEffect(function installAttributeIdAction() {
    const disposer = onAction(graphModel, action => {
      if (action.name === 'setAttributeID') {
        const [place, attrID] = action.args || [],
          attrIDs = plotType === 'dotPlot' ? [attrID] :
            [attrID, place === 'bottom' ? graphModel.getAttributeID('left') : graphModel.getAttributeID('bottom')]
        enableAnimation.current = true
        casesRef.current = filterCases(dataset, graphModel, attrIDs)
        callMatchCirclesToData()
      }
    }, true)
    return () => disposer()
  }, [dataset, plotType, callMatchCirclesToData, casesRef, enableAnimation, graphModel])

  // respond to change in plotType
  useEffect(function installPlotTypeAction() {
    const disposer = onAction(graphModel, action => {
      if (action.name === 'setPlotType') {
        const newPlotType = action.args?.[0],
          attrIDs = newPlotType === 'dotPlot' ? [xAttrID] : [xAttrID, yAttrID]
        enableAnimation.current = true
        casesRef.current = filterCases(dataset, graphModel, attrIDs)
        callMatchCirclesToData()
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

