import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { AdornmentModel, IAdornmentModel } from "../adornment-models"
import { kRegionOfInterestType } from "./region-of-interest-adornment-types"

export type YAxisOptions = "y" // TODO: add support for y2 option

export const PrimaryProps = types.model("PrimaryProps", {
  position: types.maybe(types.union(types.number, types.string)),
  extent: types.maybe(types.union(types.number, types.string)),
})

export const SecondaryProps = types.model("SecondaryProps", {
  position: types.maybe(types.union(types.number, types.string)),
  extent: types.maybe(types.union(types.number, types.string)),
  axis: types.maybe(types.enumeration<YAxisOptions>("axis", ["y"]))
})


export const RegionOfInterestAdornmentModel = AdornmentModel
  .named("RegionOfInterestAdornmentModel")
  .props({
    type: types.optional(types.literal(kRegionOfInterestType), kRegionOfInterestType),
    primary: types.optional(PrimaryProps, {position: 0, extent: "100%"}),
    secondary: types.optional(SecondaryProps, {position: 0, extent: "100%"})
  })
  .actions(self => ({
    setPrimary(primary: IPrimaryProps) {
      self.primary = primary
    },
    setSecondary(secondary: ISecondaryProps) {
      const { position, extent, axis } = secondary
      self.secondary = {
        position,
        extent,
        axis
      }
    }

  }))

export interface IPrimaryProps extends Instance<typeof PrimaryProps> {}
export interface ISecondaryProps extends Instance<typeof SecondaryProps> {}

export interface IRegionOfInterestAdornmentModelSnapshot extends SnapshotIn<typeof RegionOfInterestAdornmentModel> {}
export interface IRegionOfInterestAdornmentModel extends Instance<typeof RegionOfInterestAdornmentModel> {}

export function isRegionOfInterestAdornment(adornment: IAdornmentModel): adornment is IRegionOfInterestAdornmentModel {
  return adornment.type === kRegionOfInterestType
}
