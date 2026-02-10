import { mstReaction } from "../../../utilities/mst-reaction"
import {AxisPlace, AxisPlaces} from "../../axis/axis-types"
import { EmptyAxisModel, isEmptyAxisModel } from "../../axis/models/axis-model"
import { isAnyCategoricalAxisModel } from "../../axis/models/categorical-axis-models"
import { isAnyNumericAxisModel } from "../../axis/models/numeric-axis-models"
import { axisPlaceToAttrRole } from "../../data-display/data-display-types"
import {matchCirclesToData} from "../../data-display/data-display-utils"
import { PointRendererBase } from "../../data-display/renderer"
import {IGraphContentModel} from "./graph-content-model"
import {GraphLayout} from "./graph-layout"
import { syncModelWithAttributeConfiguration } from "./graph-model-utils"

interface IGraphControllerProps {
  layout: GraphLayout
  instanceId: string
}

export class GraphController {
  graphModel?: IGraphContentModel
  renderer?: PointRendererBase
  layout: GraphLayout
  instanceId: string
  axisReactionDisposer?: () => void

  constructor({layout, instanceId}: IGraphControllerProps) {
    this.layout = layout
    this.instanceId = instanceId
  }

  cleanup() {
    this.axisReactionDisposer?.()
  }

  setProperties(graphModel: IGraphContentModel, renderer?: PointRendererBase) {
    this.graphModel = graphModel
    this.renderer = renderer

    const { dataset, metadata } = graphModel
    if (this.graphModel.dataConfiguration.dataset !== dataset) {
      this.graphModel.dataConfiguration.setDataset(dataset, metadata)
    }

    // Ensure primaryRole is consistent with the current attribute types.
    // On document restore, the snapshot may have a primaryRole that pointed to an attribute
    // whose type was overridden (e.g. numeric treated as categorical), requiring a swap.
    graphModel.syncPrimaryRoleWithAttributeConfiguration()

    this.installAxisReaction()
    this.syncAxisScalesWithModel()
  }

  installAxisReaction() {
    this.axisReactionDisposer?.()

    if (this.graphModel) {
      this.axisReactionDisposer = mstReaction(
        () => [this.graphModel?.getAxis("left"), this.graphModel?.getAxis("bottom")],
        () => {
          this.syncAxisScalesWithModel(false)
        }, {name: "graphModel [axisChange]"}, this.graphModel
      )
    }
  }

  handleAttributeAssignment() {
    const { graphModel, layout } = this
    if (graphModel) syncModelWithAttributeConfiguration(graphModel, layout)
  }

  callMatchCirclesToData() {
    const {graphModel, renderer, instanceId} = this
    if (graphModel && renderer) {
      const { dataConfiguration } = graphModel,
        {pointColor, pointStrokeColor} = graphModel.pointDescription,
        pointRadius = graphModel.getPointRadius(),
        pointDisplayType = graphModel.plot.displayType,
        startAnimation = graphModel.startAnimation
      dataConfiguration && matchCirclesToData({
        dataConfiguration, renderer, pointDisplayType,
        pointRadius, startAnimation, instanceId, pointColor, pointStrokeColor
      })
    }
  }

  // Called after restore from document or undo/redo, i.e. the models are all configured
  // appropriately but the scales and other non-serialized properties need to be synced.
  syncAxisScalesWithModel(alsoCallMatchCirclesToData = true) {
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
          if (isAnyCategoricalAxisModel(axisModel)) {
            axisMultiScale.setCategoricalDomain(dataConfig.categoryArrayForAttrRole(attrRole))
            axisMultiScale.setCategorySet(dataConfig.categorySetForAttrRole(attrRole))
          }
          if (isAnyNumericAxisModel(axisModel)) {
            axisMultiScale.setNumericDomain(axisModel.domain)
          }
        }
        else {
          // During rehydration we need to reset each axis scale
          layout.resetAxisScale(axisPlace)
        }
      })
      alsoCallMatchCirclesToData && this.callMatchCirclesToData()
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
}
