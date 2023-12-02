import {DataDisplayLayout} from "../../data-display/models/data-display-layout"
import {IMapContentModel} from "./map-content-model"

interface IMapControllerConstructorProps {
  mapModel?: IMapContentModel
  layout: DataDisplayLayout
  instanceId: string
}

export class MapController {
  mapModel?: IMapContentModel
  layout: DataDisplayLayout
  instanceId: string

  constructor({mapModel, layout, instanceId}: IMapControllerConstructorProps) {
    this.mapModel = mapModel
    this.layout = layout
    this.instanceId = instanceId
  }

}
