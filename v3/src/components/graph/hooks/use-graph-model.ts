import {useCallback, useEffect} from "react"
import {mstReaction} from "../../../utilities/mst-reaction"
import {onAnyAction} from "../../../utilities/mst-utils"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {matchCirclesToData} from "../../data-display/data-display-utils"
import {setNiceDomain} from "../utilities/graph-utils"
import {IPixiPointsRef} from "../utilities/pixi-points"
import {IGraphContentModel} from "../models/graph-content-model"
import {INumericAxisModel} from "../../axis/models/axis-model"

interface IProps {
  graphModel: IGraphContentModel
  pixiPointsRef: IPixiPointsRef
  instanceId: string | undefined
}

export function useGraphModel(props: IProps) {
  const {graphModel, instanceId, pixiPointsRef} = props,
    dataConfig = graphModel.dataConfiguration,
    yAxisModel = graphModel.getAxis('left'),
    yAttrID = graphModel.getAttributeID('y'),
    dataset = useDataSetContext(),
    startAnimation = graphModel.startAnimation

  const callMatchCirclesToData = useCallback(() => {
    if (!pixiPointsRef.current) {
      return
    }

    dataConfig && matchCirclesToData({
      dataConfiguration: dataConfig,
      pixiPoints: pixiPointsRef.current,
      pointRadius: graphModel.getPointRadius(),
      pointColor: graphModel.pointDescription.pointColor,
      pointDisplayType: graphModel.pointDisplayType,
      pointStrokeColor: graphModel.pointDescription.pointStrokeColor,
      startAnimation, instanceId
    })
  }, [dataConfig, pixiPointsRef, graphModel, startAnimation, instanceId])

  // respond to change in plotType
  useEffect(function installPlotTypeAction() {
    const disposer = onAnyAction(graphModel, action => {
      if (action.name === 'setPlotType') {
        const { caseDataArray } = dataConfig || {}
        const newPlotType = action.args?.[0]/*,
          attrIDs = newPlotType === 'dotPlot' ? [xAttrID] : [xAttrID, yAttrID]*/
        startAnimation()
        // In case the y-values have changed we rescale
        if (newPlotType === 'scatterPlot') {
          const values = caseDataArray?.map(({ caseID }) => dataset?.getNumeric(caseID, yAttrID)) as number[]
          setNiceDomain(values || [], yAxisModel as INumericAxisModel)
        }
      }
    })
    return () => disposer()
  }, [dataConfig, dataset, startAnimation, graphModel, yAttrID, yAxisModel])

  // respond to point properties change
  useEffect(function respondToPointVisualChange() {
    return mstReaction(() => {
      const { pointColor, pointStrokeColor, pointStrokeSameAsFill, pointSizeMultiplier } =
        graphModel.pointDescription
      return [pointColor, pointStrokeColor, pointStrokeSameAsFill, pointSizeMultiplier]
    },
      () => callMatchCirclesToData(),
      {name: "respondToPointVisualChange"}, graphModel
    )
  }, [callMatchCirclesToData, graphModel])

}
