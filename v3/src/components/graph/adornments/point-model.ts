import { Instance, SnapshotIn, types } from "mobx-state-tree"

export type Point = { x: number, y: number }

export const PointModel = types.model("Point", {
    x: types.optional(types.number, NaN),
    y: types.optional(types.number, NaN)
  })
  .views(self=>({
    isValid() {
      return isFinite(self.x) && isFinite(self.y)
    }
  }))
  .actions(self => ({
    set(aPt: Point) {
      if (aPt) {
        self.x = aPt.x
        self.y = aPt.y
      }
    }
  }))
export interface IPointModel extends Instance<typeof PointModel> {}
export interface IPointModelSnapshot extends SnapshotIn<typeof PointModel> {}

export const kInfinitePoint = {x:NaN, y:NaN}
