import React from "react"
import {IGraphModel} from "./graph-model"
import {GraphLayout} from "./graph-layout"
import {IDataSet} from "../../../models/data/data-set"
import {AxisPlace, AxisPlaces} from "../../axis/axis-types"
import {
  CategoricalAxisModel, EmptyAxisModel, INumericAxisModel, isCategoricalAxisModel, NumericAxisModel
} from "../../axis/models/axis-model"
import {axisPlaceToAttrRole, graphPlaceToAttrRole, IDotsRef, PlotType} from "../graphing-types"
import {GraphPlace} from "../../axis-graph-shared"
import {matchCirclesToData, setNiceDomain} from "../utilities/graph-utils"

// keys are [primaryAxisType][secondaryAxisType]
const plotChoices: Record<string, Record<string, PlotType>> = {
  empty: {empty: 'casePlot', numeric: 'dotPlot', categorical: 'dotChart'},
  numeric: {empty: 'dotPlot', numeric: 'scatterPlot', categorical: 'dotPlot'},
  categorical: {empty: 'dotChart', numeric: 'dotPlot', categorical: 'dotChart'}
}

interface IGraphControllerConstructorProps {
  layout: GraphLayout
  enableAnimation: React.MutableRefObject<boolean>
  instanceId: string
}

interface IGraphControllerProps {
  graphModel: IGraphModel
  dataset: IDataSet | undefined
  dotsRef: IDotsRef
}

export class GraphController {
  graphModel?: IGraphModel
  layout: GraphLayout
  dataset?: IDataSet
  enableAnimation: React.MutableRefObject<boolean>
  instanceId: string

  constructor({layout, enableAnimation, instanceId}: IGraphControllerConstructorProps) {
    this.layout = layout
    this.instanceId = instanceId
    this.enableAnimation = enableAnimation
  }

  setProperties(props: IGraphControllerProps) {
    this.graphModel = props.graphModel
    this.dataset = props.dataset
    if (this.graphModel.config.dataset !== props.dataset) {
      this.graphModel.config.setDataset(props.dataset)
    }
    this.initializeGraph(props.dotsRef)
  }

  initializeGraph(dotsRef: IDotsRef) {
    const {graphModel,
        enableAnimation,
        instanceId, layout} = this,
      dataConfig = graphModel?.config
    if (dataConfig && layout && dotsRef.current) {
      AxisPlaces.forEach((axisPlace: AxisPlace) => {
        const axisModel = graphModel.getAxis(axisPlace),
          attrRole = axisPlaceToAttrRole[axisPlace]
        if (axisModel) {
          layout.setAxisScaleType(axisPlace, axisModel.scale)
          if (isCategoricalAxisModel(axisModel)) {
            layout.getAxisMultiScale(axisPlace)
              .setCategoricalDomain(dataConfig.categorySetForAttrRole(attrRole) ?? [])
          }
        }
      })
      matchCirclesToData({
        dataConfiguration: dataConfig, dotsElement: dotsRef.current,
        pointRadius: graphModel.getPointRadius(), enableAnimation, instanceId,
        pointColor: graphModel.pointColor,
        pointStrokeColor: graphModel.pointStrokeColor
      })
    }
  }

  handleAttributeAssignment(graphPlace: GraphPlace, attrID: string) {
    const {graphModel, layout, dataset} = this,
      dataConfig = graphModel?.config
    if (!(graphModel && layout && dataset && dataConfig)) {
      return
    }
    if (['plot', 'legend'].includes(graphPlace)) {
      // Since there is no axis associated with the legend and the plotType will not change, we bail
      return
    } else if (graphPlace === 'yPlus') {
      // The yPlus attribute utilizes the left numeric axis for plotting but doesn't change anything else
      const yAxisModel = graphModel.getAxis('left')
      yAxisModel && setNiceDomain(dataConfig.numericValuesForYAxis, yAxisModel)
      return
    }

    const setPrimaryRoleAndPlotType = () => {
      const axisPlace = graphPlace as AxisPlace,
        graphAttributeRole = axisPlaceToAttrRole[axisPlace]
      if (['left', 'bottom'].includes(axisPlace)) { // Only assignment to 'left' and 'bottom' change plotType
        const attributeType = dataConfig.attributeType(graphPlaceToAttrRole[graphPlace]) ?? 'empty',
          // rightNumeric only occurs in presence of scatterplot
          primaryType = graphPlace === 'rightNumeric' ? 'numeric' : attributeType,
          otherAxisPlace = axisPlace === 'bottom' ? 'left' : 'bottom',
          otherAttrRole = axisPlaceToAttrRole[otherAxisPlace],
          otherAttributeType = dataConfig.attributeType(graphPlaceToAttrRole[otherAxisPlace]) ?? 'empty',
          // Numeric attributes get priority for primaryRole when present. First one that is already present
          // and then the newly assigned one. If there is an already assigned categorical then its place is
          // the primaryRole, or, lastly, the newly assigned place
          primaryRole = otherAttributeType === 'numeric' ? otherAttrRole
            : attributeType === 'numeric' ? graphAttributeRole
              : otherAttributeType !== 'empty' ? otherAttrRole : graphAttributeRole
        dataConfig.setPrimaryRole(primaryRole)
        graphModel.setPlotType(plotChoices[primaryType][otherAttributeType])
      }
      if (dataConfig.attributeID(graphAttributeRole) !== attrID) {
        dataConfig.setAttribute(graphAttributeRole, {attributeID: attrID})
      }
    }

    const setupAxis = (place: AxisPlace) => {
      const attrRole = graphPlaceToAttrRole[place],
        attributeID = dataConfig.attributeID(attrRole),
        attr = attributeID ? dataset?.attrFromID(attributeID) : undefined,
        attrType = dataConfig.attributeType(attrRole) ?? 'empty',
        currAxisModel = graphModel.getAxis(place),
        currentType = currAxisModel?.type ?? 'empty'
      switch (attrType) {
        case 'numeric': {
          if (currentType !== 'numeric') {
            const newAxisModel = NumericAxisModel.create({place, min: 0, max: 1})
            graphModel.setAxis(place, newAxisModel)
            layout.setAxisScaleType(place, 'linear')
            setNiceDomain(attr?.numValues || [], newAxisModel)
          } else {
            setNiceDomain(attr?.numValues || [], currAxisModel as INumericAxisModel)
          }
        }
          break
        case 'categorical': {
          const setOfValues = dataConfig.categorySetForAttrRole(attrRole)
          if (currentType !== 'categorical') {
            const newAxisModel = CategoricalAxisModel.create({place})
            graphModel.setAxis(place, newAxisModel)
            layout.setAxisScaleType(place, 'band')
          }
          layout.getAxisMultiScale(place)?.setCategoricalDomain(setOfValues)
        }
          break
        case 'empty': {
          if (currentType !== 'empty') {
            layout.setAxisScaleType(place, 'ordinal')
            if (['left', 'bottom'].includes(place)) {
              graphModel.setAxis(place, EmptyAxisModel.create({place}))
            }
            else {
              graphModel.removeAxis(place)
            }
          }
        }
      }
    }

    setPrimaryRoleAndPlotType()
    AxisPlaces.forEach(setupAxis)
  }
}
