import {IMapContentModel} from "./map-content-model"
import {MapLayout} from "./map-layout"

interface IMapControllerConstructorProps {
  mapModel?: IMapContentModel
  layout: MapLayout
  instanceId: string
}

export class MapController {
  mapModel?: IMapContentModel
  layout: MapLayout
  instanceId: string

  constructor({mapModel, layout, instanceId}: IMapControllerConstructorProps) {
    this.mapModel = mapModel
    this.layout = layout
    this.instanceId = instanceId
  }

}
