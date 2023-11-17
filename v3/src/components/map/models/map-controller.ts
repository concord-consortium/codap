import {DotsElt} from "../../data-display/d3-types"
import {matchCirclesToData} from "../../data-display/data-display-utils"
import {IMapContentModel} from "./map-content-model"
import {MapLayout} from "./map-layout"
import {isMapPointLayerModel} from "./map-point-layer-model"

interface IMapControllerConstructorProps {
  layout: MapLayout
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
  instanceId: string

  constructor({layout, instanceId}: IMapControllerConstructorProps) {
    this.layout = layout
    this.instanceId = instanceId
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
          startAnimation: this.mapModel?.startAnimation || (() => {}),
          instanceId: this.instanceId,
          pointColor: pointDescription?.pointColor,
          pointStrokeColor: pointDescription?.pointStrokeColor
        })
      }
    })
  }

}
