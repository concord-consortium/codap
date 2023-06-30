import React from "react"
import {getDataSetFromId} from "../../../models/shared/shared-data-utils"
import {IDotsRef} from "../../data-display/data-display-types"
import {IGraphContentModel} from "./graph-content-model"
import {GraphLayout} from "./graph-layout"
import {AxisPlace, AxisPlaces} from "../../axis/axis-types"
import {
  CategoricalAxisModel, EmptyAxisModel, isCategoricalAxisModel, isEmptyAxisModel, isNumericAxisModel, NumericAxisModel
} from "../../axis/models/axis-model"
import {axisPlaceToAttrRole, graphPlaceToAttrRole, PlotType} from "../graphing-types"
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
  graphContentModel: IGraphContentModel
  dotsRef: IDotsRef
}

export class GraphController {
  graphContentModel?: IGraphContentModel
  dotsRef?: IDotsRef
  layout: GraphLayout
  enableAnimation: React.MutableRefObject<boolean>
  instanceId: string

  constructor({layout, enableAnimation, instanceId}: IGraphControllerConstructorProps) {
    this.layout = layout
    this.instanceId = instanceId
    this.enableAnimation = enableAnimation
  }

  setProperties(props: IGraphControllerProps) {
    this.graphContentModel = props.graphContentModel
    this.dotsRef = props.dotsRef
    if (this.graphContentModel.dataConfiguration.dataset !== this.graphContentModel.dataset) {
      this.graphContentModel.dataConfiguration.setDataset(
        this.graphContentModel.dataset, this.graphContentModel.metadata)
    }
    this.initializeGraph()
  }

  callMatchCirclesToData() {
    const {graphContentModel, dotsRef, enableAnimation, instanceId} = this
    if (graphContentModel && dotsRef?.current) {
      const { dataConfiguration, pointColor, pointStrokeColor } = graphContentModel,
        pointRadius = graphContentModel.getPointRadius()
      dataConfiguration && matchCirclesToData({
        dataConfiguration, dotsElement: dotsRef.current,
        pointRadius, enableAnimation, instanceId, pointColor, pointStrokeColor
      })
    }
  }

  initializeGraph() {
    const {graphContentModel, dotsRef, layout} = this,
      dataConfig = graphContentModel?.dataConfiguration
    if (dataConfig && layout && dotsRef?.current) {
      AxisPlaces.forEach((axisPlace: AxisPlace) => {
        const axisModel = graphContentModel.getAxis(axisPlace),
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
    }
  }

  handleAttributeAssignment(graphPlace: GraphPlace, dataSetID: string, attrID: string) {
    const {graphContentModel, layout} = this,
      dataset = getDataSetFromId(graphContentModel, dataSetID),
      dataConfig = graphContentModel?.dataConfiguration
    if (!(graphContentModel && layout && dataset && dataConfig)) {
      return
    }
    this.callMatchCirclesToData()
    if (['plot', 'legend'].includes(graphPlace)) {
      // Since there is no axis associated with the legend and the plotType will not change, we bail
      return
    } else if (graphPlace === 'yPlus') {
      // The yPlus attribute utilizes the left numeric axis for plotting but doesn't change anything else
      const yAxisModel = graphContentModel.getAxis('left')
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
        graphContentModel.setPlotType(plotChoices[primaryType][otherAttributeType])
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
        currAxisModel = graphContentModel.getAxis(place),
        currentType = currAxisModel?.type ?? 'empty'
      switch (attrType) {
        case 'numeric': {
          if (!currAxisModel || !isNumericAxisModel(currAxisModel)) {
            const newAxisModel = NumericAxisModel.create({place, min: 0, max: 1})
            graphContentModel.setAxis(place, newAxisModel)
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
            graphContentModel.setAxis(place, newAxisModel)
            layout.setAxisScaleType(place, 'band')
          }
          layout.getAxisMultiScale(place)?.setCategorySet(dataConfig.categorySetForAttrRole(attrRole))
        }
          break
        case 'empty': {
          if (currentType !== 'empty') {
            layout.setAxisScaleType(place, 'ordinal')
            if (['left', 'bottom'].includes(place)) {
              graphContentModel.setAxis(place, EmptyAxisModel.create({place}))
            }
            else {
              graphContentModel.removeAxis(place)
            }
          }
        }
      }
    }

    setPrimaryRoleAndPlotType()
    AxisPlaces.forEach(setupAxis)
  }
}
