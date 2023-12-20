import { Instance, SnapshotOut, types } from "mobx-state-tree"

export const LatLngModel = types.model("LatLngModel", {
  lat: 0,
  lng: 0
})
export interface ILatLngModel extends Instance<typeof LatLngModel> {}
export interface ILatLngSnapshot extends SnapshotOut<typeof LatLngModel> {}

export interface IMapCenterZoom {
  center: ILatLngSnapshot
  zoom: number
}
