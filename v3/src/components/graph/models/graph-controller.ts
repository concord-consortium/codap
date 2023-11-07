import React from "react"
import {getDataSetFromId} from "../../../models/shared/shared-data-utils"
import {IDotsRef} from "../../data-display/data-display-types"
import {matchCirclesToData} from "../../data-display/data-display-utils"
import {setNiceDomain} from "../utilities/graph-utils"
import {IGraphContentModel} from "./graph-content-model"
import {GraphLayout} from "./graph-layout"
import {AxisPlace, AxisPlaces} from "../../axis/axis-types"
import {
  CategoricalAxisModel, EmptyAxisModel, isCategoricalAxisModel, isEmptyAxisModel, isNumericAxisModel, NumericAxisModel
} from "../../axis/models/axis-model"
import {axisPlaceToAttrRole, graphPlaceToAttrRole, PlotType} from "../graphing-types"
import {GraphPlace} from "../../axis-graph-shared"

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
  graphModel: IGraphContentModel
  dotsRef: IDotsRef
}

export class GraphController {
  graphModel?: IGraphContentModel
  dotsRef?: IDotsRef
  layout: GraphLayout
  enableAnimation: React.MutableRefObject<boolean>
  instanceId: string
  // tracks the currently configured attribute descriptions so that we know whether
  // initializeGraph needs to do anything or not, e.g. when handling undo/redo.
  attrConfigForInitGraph = ""

  constructor({layout, enableAnimation, instanceId}: IGraphControllerConstructorProps) {
    this.layout = layout
    this.instanceId = instanceId
    this.enableAnimation = enableAnimation
  }

  setProperties(props: IGraphControllerProps) {
    this.graphModel = props.graphModel
    this.dotsRef = props.dotsRef
    if (this.graphModel.dataConfiguration.dataset !== this.graphModel.dataset) {
      this.graphModel.dataConfiguration.setDataset(
        this.graphModel.dataset, this.graphModel.metadata)
    }
    this.initializeGraph()
  }

  callMatchCirclesToData() {
    const {graphModel, dotsRef, enableAnimation, instanceId} = this
    if (graphModel && dotsRef?.current) {
      const { dataConfiguration } = graphModel,
        {pointColor, pointStrokeColor} = graphModel.pointDescription,
        pointRadius = graphModel.getPointRadius()
      dataConfiguration && matchCirclesToData({
        dataConfiguration, dotsElement: dotsRef.current,
        pointRadius, enableAnimation, instanceId, pointColor, pointStrokeColor
      })
    }
  }

  // Called after restore from document or undo/redo, i.e. the models are all configured
  // appropriately but the scales and other non-serialized properties need to be synced.
  initializeGraph() {
    const {graphModel, dotsRef, layout} = this,
      dataConfig = graphModel?.dataConfiguration
    if (dataConfig && layout && dotsRef?.current &&
        this.attrConfigForInitGraph !== dataConfig.attributeDescriptionsStr) {
      AxisPlaces.forEach((axisPlace: AxisPlace) => {
        const axisModel = graphModel.getAxis(axisPlace),
          attrRole = axisPlaceToAttrRole[axisPlace]
        if (axisModel) {
          layout.setAxisScaleType(axisPlace, axisModel.scale)
          const axisMultiScale = layout.getAxisMultiScale(axisPlace)
          if (isEmptyAxisModel(axisModel)) {  // EmptyAxisModel
            axisMultiScale.setScaleType('ordinal')
          }
          if (isCategoricalAxisModel(axisModel)) {
            axisMultiScale.setCategorySet(dataConfig.categorySetForAttrRole(attrRole))
          }
          if (isNumericAxisModel(axisModel)) {
            axisMultiScale.setNumericDomain(axisModel.domain)
          }
        }
      })
      this.callMatchCirclesToData()
      this.attrConfigForInitGraph = dataConfig.attributeDescriptionsStr
    }
  }

  clearGraph() {
    const {graphModel} = this
    graphModel?.setPlotType("casePlot")
    AxisPlaces.forEach(place => {
      if (["left", "bottom"].includes(place)) {
        graphModel?.setAxis(place, EmptyAxisModel.create({ place }))
      }
      else {
        graphModel?.removeAxis(place)
      }
    })
    graphModel?.dataConfiguration.clearAttributes()
  }

  handleAttributeAssignment(graphPlace: GraphPlace, dataSetID: string, attrID: string) {
    const {graphModel, layout} = this,
      dataConfig = graphModel?.dataConfiguration,
      dataset = getDataSetFromId(graphModel, dataSetID) ?? dataConfig?.dataset
    if (!(graphModel && layout && dataConfig)) {
      return
    }
    this.callMatchCirclesToData()
    this.attrConfigForInitGraph = dataConfig.attributeDescriptionsStr

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
          primaryType = attributeType,
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
          if (!currAxisModel || !isNumericAxisModel(currAxisModel)) {
            const newAxisModel = NumericAxisModel.create({place, min: 0, max: 1})
            graphModel.setAxis(place, newAxisModel)
            dataConfig.setAttributeType(attrRole, 'numeric')
            layout.setAxisScaleType(place, 'linear')
            setNiceDomain(attr?.numValues || [], newAxisModel)
          } else {
            setNiceDomain(attr?.numValues || [], currAxisModel)
          }
        }
          break
        case 'categorical': {
          if (currentType !== 'categorical') {
            const newAxisModel = CategoricalAxisModel.create({place})
            graphModel.setAxis(place, newAxisModel)
            dataConfig.setAttributeType(attrRole, 'categorical')
            layout.setAxisScaleType(place, 'band')
          }
          layout.getAxisMultiScale(place)?.setCategorySet(dataConfig.categorySetForAttrRole(attrRole))
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
    this.attrConfigForInitGraph = dataConfig.attributeDescriptionsStr
  }
}
