import React from "react"
import {DotsElt} from "../../data-display/d3-types"
import {matchCirclesToData} from "../../data-display/data-display-utils"
import {IMapContentModel} from "./map-content-model"
import {MapLayout} from "./map-layout"
import {isMapPointLayerModel} from "./map-point-layer-model"

interface IMapControllerConstructorProps {
  layout: MapLayout
  enableAnimation: React.MutableRefObject<boolean>
  instanceId: string
}

interface IMapControllerProps {
  mapModel: IMapContentModel
  dotsElement: DotsElt
}

export class MapController {
  mapModel?: IMapContentModel
  dotsElement?: DotsElt
  layout: MapLayout
  enableAnimation: React.MutableRefObject<boolean>
  instanceId: string

  constructor({layout, enableAnimation, instanceId}: IMapControllerConstructorProps) {
    this.layout = layout
    this.instanceId = instanceId
    this.enableAnimation = enableAnimation
  }

  setProperties(props: IMapControllerProps) {
    this.mapModel = props.mapModel
    this.dotsElement = props.dotsElement
    this.initializeMap()
  }

  initializeMap() {
    const {mapModel, dotsElement} = this,
      layerModels = (mapModel?.layers || [])
    if (!dotsElement) {
      return
    }
    layerModels.forEach(aLayerModel => {
      if (isMapPointLayerModel(aLayerModel)) {
        const pointDescription = aLayerModel.pointDescription
        matchCirclesToData({
          dataConfiguration: aLayerModel.dataConfiguration,
          dotsElement,
          pointRadius: aLayerModel.getPointRadius(),
          enableAnimation: this.enableAnimation,
          instanceId: this.instanceId,
          pointColor: pointDescription?.pointColor,
          pointStrokeColor: pointDescription?.pointStrokeColor
        })
      }
    })
  }

}
