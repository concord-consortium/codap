import React from "react"
import {IDotsRef} from "../../data-display/data-display-types"
import {IMapContentModel} from "./map-content-model"
import {MapLayout} from "./map-layout"

interface IMapControllerConstructorProps {
  layout: MapLayout
  enableAnimation: React.MutableRefObject<boolean>
  instanceId: string
}

interface IMapControllerProps {
  mapContentModel: IMapContentModel
  dotsRef: IDotsRef
}

export class MapController {
  mapContentModel?: IMapContentModel
  dotsRef?: IDotsRef
  layout: MapLayout
  enableAnimation: React.MutableRefObject<boolean>
  instanceId: string

  constructor({layout, enableAnimation, instanceId}: IMapControllerConstructorProps) {
    this.layout = layout
    this.instanceId = instanceId
    this.enableAnimation = enableAnimation
  }

  setProperties(props: IMapControllerProps) {
    this.mapContentModel = props.mapContentModel
    this.dotsRef = props.dotsRef
/*
    if (this.mapContentModel.config.dataset !== this.mapContentModel.data) {
      this.mapContentModel.config.setDataset(this.mapContentModel.data, this.mapContentModel.metadata)
    }
*/
    this.initializeMap()
  }

  callMatchCirclesToData() {
    console.warn('callMatchCirclesToData NYI')
/*
    const {mapContentModel, dotsRef, enableAnimation, instanceId} = this
    if (mapContentModel && dotsRef?.current) {
      const { config: dataConfiguration, pointColor, pointStrokeColor } = mapContentModel,
        pointRadius = mapContentModel.getPointRadius()
      matchCirclesToData({
        dataConfiguration, dotsElement: dotsRef.current,
        pointRadius, enableAnimation, instanceId, pointColor, pointStrokeColor
      })
    }
*/
  }

  initializeMap() {
    console.warn('initializeMap NYI')
/*
    const {mapContentModel, dotsRef, layout} = this,
      dataConfig = mapContentModel?.config
    if (dataConfig && layout && dotsRef?.current) {
      this.callMatchCirclesToData()
    }
*/
  }

}
