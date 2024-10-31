import {useEffect} from "react"
import {onAnyAction} from "../../../utilities/mst-utils"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import { dataDisplayGetNumericValue } from "../../data-display/data-display-value-utils"
import {setNiceDomain} from "../utilities/graph-utils"
import {IGraphContentModel} from "../models/graph-content-model"
import {IBaseNumericAxisModel} from "../../axis/models/axis-model"

interface IProps {
  graphModel: IGraphContentModel
}

export function useGraphModel(props: IProps) {
  const {graphModel} = props,
    dataConfig = graphModel.dataConfiguration,
    yAxisModel = graphModel.getAxis('left'),
    yAttrID = graphModel.getAttributeID('y'),
    dataset = useDataSetContext(),
    startAnimation = graphModel.startAnimation

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
          const values = caseDataArray?.map(({ caseID }) =>
            dataDisplayGetNumericValue(dataset, caseID, yAttrID)) as number[]
          setNiceDomain(values || [], yAxisModel as IBaseNumericAxisModel)
        }
      }
    })
    return () => disposer()
  }, [dataConfig, dataset, startAnimation, graphModel, yAttrID, yAxisModel])
}
