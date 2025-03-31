import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { AdornmentModel, IAdornmentModel } from "../adornment-models"
import { kDefaultX, kDefaultY, kRegionOfInterestType }
  from "./region-of-interest-adornment-types"

export type RoiPositionUnit = "coordinate" | "percent" | "%"

export const RoiPositionModel = types.model("RoiPositionModel", {
  unit: types.enumeration<RoiPositionUnit>("unit", ["coordinate", "percent", "%"]),
  value: types.number
})

export const RegionOfInterestAdornmentModel = AdornmentModel
  .named("RegionOfInterestAdornmentModel")
  .props({
    type: types.optional(types.literal(kRegionOfInterestType), kRegionOfInterestType),
    height: types.maybe(types.number),
    width: types.maybe(types.number),
    xAttribute: types.optional(types.string, ""),
    xPosition: types.optional(RoiPositionModel, { unit: "coordinate", value: kDefaultX }),
    yAttribute: types.optional(types.string, ""),
    yPosition: types.optional(RoiPositionModel, { unit: "coordinate", value: kDefaultY })
  })
  .actions(self => ({
    setHeight(height: number) {
      self.height = height
    },
    setWidth(width: number) {
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
    setSize(width: number, height: number) {
      self.width = width
      self.height = height
    }
  }))

export interface IRoiPositionModel extends Instance<typeof RoiPositionModel> {}
export interface IRegionOfInterestAdornmentModelSnapshot extends SnapshotIn<typeof RegionOfInterestAdornmentModel> {}
export interface IRegionOfInterestAdornmentModel extends Instance<typeof RegionOfInterestAdornmentModel> {}

export function isRegionOfInterestAdornment(adornment: IAdornmentModel): adornment is IRegionOfInterestAdornmentModel {
  return adornment.type === kRegionOfInterestType
}
