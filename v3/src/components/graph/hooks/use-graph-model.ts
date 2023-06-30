import {MutableRefObject, useCallback, useEffect} from "react"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {IGraphContentModel, isGraphVisualPropsAction} from "../models/graph-content-model"
import {INumericAxisModel} from "../../axis/models/axis-model"
import {onAnyAction} from "../../../utilities/mst-utils"
import {IDotsRef} from "../../data-display/data-display-types"
import {matchCirclesToData, setNiceDomain, startAnimation} from "../utilities/graph-utils"

interface IProps {
  graphModel: IGraphContentModel
  enableAnimation: MutableRefObject<boolean>
  dotsRef: IDotsRef
  instanceId: string | undefined
}

export function useGraphModel(props: IProps) {
  const {graphModel, enableAnimation, dotsRef, instanceId} = props,
    dataConfig = graphModel.dataConfiguration,
    yAxisModel = graphModel.getAxis('left'),
    yAttrID = graphModel.getAttributeID('y'),
    dataset = useDataSetContext()

  const callMatchCirclesToData = useCallback(() => {
    dataConfig && matchCirclesToData({
      dataConfiguration: dataConfig,
      pointRadius: graphModel.getPointRadius(),
      pointColor: graphModel.pointColor,
      pointStrokeColor: graphModel.pointStrokeColor,
      dotsElement: dotsRef.current,
      enableAnimation, instanceId
    })
  }, [dataConfig, graphModel, dotsRef, enableAnimation, instanceId])

  // respond to change in plotType
  useEffect(function installPlotTypeAction() {
    const disposer = onAnyAction(graphModel, action => {
      if (action.name === 'setPlotType') {
        const newPlotType = action.args?.[0]/*,
          attrIDs = newPlotType === 'dotPlot' ? [xAttrID] : [xAttrID, yAttrID]*/
        startAnimation(enableAnimation)
        // In case the y-values have changed we rescale
        if (newPlotType === 'scatterPlot') {
          const values = dataConfig?.caseDataArray.map(({ caseID }) => dataset?.getNumeric(caseID, yAttrID)) as number[]
          setNiceDomain(values || [], yAxisModel as INumericAxisModel)
        }
      }
    })
    return () => disposer()
  }, [dataConfig?.caseDataArray, dataset, enableAnimation, graphModel, yAttrID, yAxisModel])

  // respond to point properties change
  useEffect(function respondToGraphPointVisualAction() {
    const disposer = onAnyAction(graphModel, action => {
      if (isGraphVisualPropsAction(action)) {
        callMatchCirclesToData()
      }
    })
    return () => disposer()
  }, [callMatchCirclesToData, graphModel])

}
