import {AxisPlace, AxisPlaces} from "../../axis/axis-types"
import {
  CategoricalAxisModel, EmptyAxisModel, isCategoricalAxisModel, isEmptyAxisModel, isNumericAxisModel, NumericAxisModel
} from "../../axis/models/axis-model"
import {axisPlaceToAttrRole, graphPlaceToAttrRole} from "../../data-display/data-display-types"
import {matchCirclesToData} from "../../data-display/data-display-utils"
import {PixiPoints} from "../../data-display/pixi/pixi-points"
import { PlotType } from "../graphing-types"
import {setNiceDomain} from "../utilities/graph-utils"
import {IGraphContentModel} from "./graph-content-model"
import {GraphLayout} from "./graph-layout"

// keys are [primaryAxisType][secondaryAxisType]
const plotChoices: Record<string, Record<string, PlotType>> = {
  empty: {empty: 'casePlot', numeric: 'dotPlot', categorical: 'dotChart'},
  numeric: {empty: 'dotPlot', numeric: 'scatterPlot', categorical: 'dotPlot'},
  categorical: {empty: 'dotChart', numeric: 'dotPlot', categorical: 'dotChart'}
}

interface IGraphControllerProps {
  layout: GraphLayout
  instanceId: string
}

export class GraphController {
  graphModel?: IGraphContentModel
  pixiPoints?: PixiPoints
  layout: GraphLayout
  instanceId: string

  constructor({layout, instanceId}: IGraphControllerProps) {
    this.layout = layout
    this.instanceId = instanceId
  }

  setProperties(graphModel: IGraphContentModel, pixiPoints?: PixiPoints) {
    this.graphModel = graphModel
    this.pixiPoints = pixiPoints

    const { dataset, metadata } = graphModel
    if (this.graphModel.dataConfiguration.dataset !== dataset) {
      this.graphModel.dataConfiguration.setDataset(dataset, metadata)
    }

    this.syncAxisScalesWithModel()
  }

  setPrimaryRoleAndPlotType() {
    const { graphModel } = this
    const dataConfig = graphModel?.dataConfiguration
    const oldPrimaryRole = dataConfig?.primaryRole ?? "x"
    const axisPlace = oldPrimaryRole === "x" ? "bottom" : "left"
    const attributeType = dataConfig?.attributeType(graphPlaceToAttrRole[axisPlace]) ?? 'empty'
    const otherAxisPlace = axisPlace === "bottom" ? "left" : "bottom"
    const otherAttrRole = axisPlaceToAttrRole[otherAxisPlace]
    const otherAttributeType = dataConfig?.attributeType(graphPlaceToAttrRole[otherAxisPlace]) ?? 'empty',
    // Numeric attributes get priority for primaryRole when present. First one that is already present
    // and then the newly assigned one. If there is an already assigned categorical then its place is
    // the primaryRole, or, lastly, the newly assigned place
    primaryRole = attributeType === 'numeric' ? oldPrimaryRole
      : otherAttributeType === 'numeric' ? otherAttrRole
        : attributeType !== 'empty' ? oldPrimaryRole : otherAttrRole
    dataConfig?.setPrimaryRole(primaryRole)
    // TODO COLOR: treat color like categorical for now
    const primaryType = attributeType === 'color' ? 'categorical' : attributeType
    // This doesn't actually necessarily index by [primary][secondary], but that doesn't matter.
    graphModel?.setPlotType(plotChoices[primaryType][otherAttributeType])
  }

  setupAxes() {
    const setupAxis = (place: AxisPlace) => {
      const { graphModel, layout } = this
      const dataConfig = graphModel?.dataConfiguration
      const dataset = dataConfig?.dataset
      const attrRole = graphPlaceToAttrRole[place],
        attributeID = dataConfig?.attributeID(attrRole),
        attr = attributeID ? dataset?.attrFromID(attributeID) : undefined,
        primaryRole = dataConfig?.primaryRole,
        secondaryPlace = primaryRole === 'x' ? 'left' : 'bottom',
        attrType = dataConfig?.attributeType(attrRole),
        fallbackType = (place === secondaryPlace && graphModel?.pointsFusedIntoBars) ? 'numeric' : 'empty',
        requiredType = attrType ?? fallbackType,
        currAxisModel = graphModel?.getAxis(place),
        currentType = currAxisModel?.type ?? 'empty'
      switch (requiredType) {
        case 'numeric': {
          if (!currAxisModel || !isNumericAxisModel(currAxisModel)) {
            const newAxisModel = NumericAxisModel.create({place, min: 0, max: 1})
            graphModel?.setAxis(place, newAxisModel)
            dataConfig?.setAttributeType(attrRole, 'numeric')
            layout.setAxisScaleType(place, 'linear')
            setNiceDomain(attr?.numValues || [], newAxisModel, graphModel?.axisDomainOptions)
          } else {
            setNiceDomain(attr?.numValues || [], currAxisModel, graphModel?.axisDomainOptions)
          }
        }
          break
        case 'categorical':
        case 'color': { // TODO COLOR: treat color like categorical for now
          if (currentType !== 'categorical') {
            const newAxisModel = CategoricalAxisModel.create({place})
            graphModel?.setAxis(place, newAxisModel)
            dataConfig?.setAttributeType(attrRole, 'categorical')
            layout.setAxisScaleType(place, 'band')
          }
          layout.getAxisMultiScale(place)?.setCategorySet(dataConfig?.categorySetForAttrRole(attrRole))
        }
          break
        case 'empty': {
          if (currentType !== 'empty') {
            layout.setAxisScaleType(place, 'ordinal')
            if (['left', 'bottom'].includes(place)) {
              graphModel?.setAxis(place, EmptyAxisModel.create({place}))
            }
            else {
              graphModel?.removeAxis(place)
            }
          }
        }
      }
    }

    AxisPlaces.forEach(setupAxis)
  }

  callMatchCirclesToData() {
    const {graphModel, pixiPoints, instanceId} = this
    if (graphModel && pixiPoints) {
      const { dataConfiguration } = graphModel,
        {pointColor, pointStrokeColor} = graphModel.pointDescription,
        pointRadius = graphModel.getPointRadius(),
        pointDisplayType = graphModel.pointDisplayType,
        startAnimation = graphModel.startAnimation
      dataConfiguration && matchCirclesToData({
        dataConfiguration, pixiPoints, pointDisplayType,
        pointRadius, startAnimation, instanceId, pointColor, pointStrokeColor
      })
    }
  }

  // Called after restore from document or undo/redo, i.e. the models are all configured
  // appropriately but the scales and other non-serialized properties need to be synced.
  syncAxisScalesWithModel() {
    const {graphModel, layout} = this,
      dataConfig = graphModel?.dataConfiguration
    if (dataConfig && layout) {
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
        else {
          // During rehydration we need to reset each axis scale
          layout.resetAxisScale(axisPlace)
        }
      })
      this.callMatchCirclesToData()
    }
  }

  syncModelWithAttributeConfiguration() {
    this.setPrimaryRoleAndPlotType()
    this.setupAxes()
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
}
