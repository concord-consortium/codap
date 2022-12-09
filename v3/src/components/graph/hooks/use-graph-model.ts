import {MutableRefObject, RefObject, useCallback, useEffect} from "react"
import {onAction} from "mobx-state-tree"
import {matchCirclesToData, setNiceDomain} from "../utilities/graph-utils"
import {IGraphModel, isGraphVisualPropsAction} from "../models/graph-model"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {INumericAxisModel} from "../models/axis-model"

interface IProps {
  graphModel: IGraphModel
  enableAnimation: MutableRefObject<boolean>
  dotsRef: RefObject<SVGSVGElement>
  instanceId: string | undefined
}

export function useGraphModel(props: IProps) {
  const {graphModel, enableAnimation, dotsRef, instanceId} = props,
    dataConfig = graphModel.config,
    yAxisModel = graphModel.getAxis('left'),
    yAttrID = graphModel.getAttributeID('y'),
    dataset = useDataSetContext()

  const callMatchCirclesToData = useCallback(() => {
    matchCirclesToData({
      dataset,
      caseIDs: dataConfig.cases,
      pointRadius: graphModel.getPointRadius(),
      pointColor: graphModel.pointColor,
      pointStrokeColor: graphModel.pointStrokeColor,
      dotsElement: dotsRef.current,
      enableAnimation, instanceId
    })
  }, [dataset, dataConfig.cases, graphModel, dotsRef, enableAnimation, instanceId])

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
        if (newPlotType === 'scatterPlot') {
          const values = dataConfig.cases.map(anID => dataset?.getNumeric(anID, yAttrID)) as number[]
          setNiceDomain(values || [], yAxisModel as INumericAxisModel)
        }
      }
    }, true)
    return () => disposer()
  }, [dataConfig.cases, dataset, enableAnimation, graphModel, yAttrID, yAxisModel])

  // respond to point properties change
  useEffect(function respondToGraphPointVisualAction() {
    const disposer = onAction(graphModel, action => {
      if (isGraphVisualPropsAction(action)) {
        callMatchCirclesToData()
      }
    }, true)
    return () => disposer()
  }, [callMatchCirclesToData, graphModel])

}
