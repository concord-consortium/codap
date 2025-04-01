import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { AdornmentModel, IAdornmentModel } from "../adornment-models"
import { kRegionOfInterestType } from "./region-of-interest-adornment-types"

export type RoiPositionUnit = "coordinate" | "percent" | "%"

export const RoiUnitValueModel = types.model("RoiPositionModel", {
  unit: types.enumeration<RoiPositionUnit>("unit", ["coordinate", "percent", "%"]),
  value: types.number
})

export const RegionOfInterestAdornmentModel = AdornmentModel
  .named("RegionOfInterestAdornmentModel")
  .props({
    type: types.optional(types.literal(kRegionOfInterestType), kRegionOfInterestType),
    height: types.maybe(RoiUnitValueModel),
    width: types.maybe(RoiUnitValueModel),
    xAttribute: types.optional(types.string, ""),
    xPosition: types.maybe(RoiUnitValueModel),
    yAttribute: types.optional(types.string, ""),
    yPosition: types.maybe(RoiUnitValueModel)
  })
  .actions(self => ({
    setHeight(height: IRoiPositionModel) {
      self.height = height
    },
    setWidth(width: IRoiPositionModel) {
      self.width = width
    },
    setXPosition(xPos: IRoiPositionModel) {
      self.xPosition = xPos
    },
    setYPosition(yPos: IRoiPositionModel) {
      self.yPosition = yPos
    },
    setPosition(x: IRoiPositionModel, y: IRoiPositionModel) {
      self.xPosition = x
      self.yPosition = y
    },
    setSize(width: IRoiPositionModel, height: IRoiPositionModel) {
      self.width = width
      self.height = height
    }
  }))

export interface IRoiPositionModel extends Instance<typeof RoiUnitValueModel> {}
export interface IRegionOfInterestAdornmentModelSnapshot extends SnapshotIn<typeof RegionOfInterestAdornmentModel> {}
export interface IRegionOfInterestAdornmentModel extends Instance<typeof RegionOfInterestAdornmentModel> {}

export function isRegionOfInterestAdornment(adornment: IAdornmentModel): adornment is IRegionOfInterestAdornmentModel {
  return adornment.type === kRegionOfInterestType
}
