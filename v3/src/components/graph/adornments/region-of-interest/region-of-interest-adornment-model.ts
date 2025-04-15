import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { AdornmentModel, IAdornmentModel } from "../adornment-models"
import { kRegionOfInterestType } from "./region-of-interest-adornment-types"

export type YAxisOptions = "y" // TODO: add support for y2 option

const BaseAxisRange = types.model({
  extent: types.maybe(types.union(types.number, types.string)),
  position: types.maybe(types.union(types.number, types.string))
})

export const PrimaryAxisRange = BaseAxisRange.named("PrimaryAxisRange")
export const SecondaryAxisRange = BaseAxisRange
  .named("SecondaryAxisRange")
  .props({
    axis: types.maybe(types.enumeration<YAxisOptions>("axis", ["y"]))
  })

export const RegionOfInterestAdornmentModel = AdornmentModel
  .named("RegionOfInterestAdornmentModel")
  .props({
    type: types.optional(types.literal(kRegionOfInterestType), kRegionOfInterestType),
    primary: types.optional(PrimaryAxisRange, {position: 0, extent: "100%"}),
    secondary: types.optional(SecondaryAxisRange, {position: 0, extent: "100%"})
  })
  .actions(self => ({
    setPrimary(primary: IPrimaryAxisRange) {
      self.primary = primary
    },
    setSecondary(secondary: ISecondaryAxisRange) {
      self.secondary = secondary
    }
  }))

export interface IPrimaryAxisRange extends Instance<typeof PrimaryAxisRange> {}
export interface ISecondaryAxisRange extends Instance<typeof SecondaryAxisRange> {}

export interface IRegionOfInterestAdornmentModelSnapshot extends SnapshotIn<typeof RegionOfInterestAdornmentModel> {}
export interface IRegionOfInterestAdornmentModel extends Instance<typeof RegionOfInterestAdornmentModel> {}

export function isRegionOfInterestAdornment(adornment: IAdornmentModel): adornment is IRegionOfInterestAdornmentModel {
  return adornment.type === kRegionOfInterestType
}
