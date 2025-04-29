import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { Point, PointModel } from "./point-model"

const kDefaultLabelHeight = 60

interface IExtents {
  labelWidth?: number
  labelHeight?: number
  plotWidth: number
  plotHeight: number
}

export const LineLabelInstance = types.model("LineLabelInstance", {
  // interpreted as proportional position of the center of the label in cell coordinates
  equationCoords: types.maybe(PointModel),
  // v2 used an iterative process which incorrectly factored in the plot height
  isV2Coords: types.maybe(types.boolean)
})
.volatile(() => ({
  // used for coordinate transformations and exporting to v2
  labelWidth: undefined as Maybe<number>,
  labelHeight: undefined as Maybe<number>,
  plotWidth: undefined as Maybe<number>,
  plotHeight: undefined as Maybe<number>
}))
.views(self => ({
  get v2ToV3AdjustedHeight() {
    const rawLabelHeight = self.labelHeight ?? kDefaultLabelHeight
    if (!self.plotHeight || !self.equationCoords || !self.isV2Coords) return rawLabelHeight
    const { y: yProportion } = self.equationCoords
    // v2 used an iterative process which incorrectly factored in the plot height
    const diffHeight = self.plotHeight - rawLabelHeight
    return rawLabelHeight + (1 - yProportion) * diffHeight * 2
  }
}))
.views(self => ({
  get labelPosition() {
    if (!self.equationCoords || !self.plotWidth || !self.plotHeight) return

    const { x: xProportion, y: yProportion } = self.equationCoords
    const labelWidthProportion = xProportion <= 0.5 ? 2 * xProportion : 2 * (1 - xProportion)
    const kDefaultLabelWidth = labelWidthProportion * self.plotWidth + (self.isV2Coords ? 3 : 0)
    const labelWidth = self.labelWidth ?? kDefaultLabelWidth
    // apply correction factor for values imported from v2
    const labelHeight = self.v2ToV3AdjustedHeight
    return {
      left: xProportion * self.plotWidth - labelWidth / 2,
      top: yProportion * self.plotHeight - labelHeight / 2
    }
  },
  get v2ExportCoords() {
    if (!self.equationCoords) return
    const { x: proportionCenterX, y: proportionCenterY } = self.equationCoords
    const v2Coords = { proportionCenterX, proportionCenterY }
    if (self.isV2Coords || !self.plotHeight) return v2Coords

    const labelHeight = self.labelHeight ?? kDefaultLabelHeight
    const heightDiff = self.plotHeight - labelHeight
    // reverse the correction factor used when importing from v2
    const _proportionCenterY = (proportionCenterY * self.plotHeight + heightDiff) / (self.plotHeight + heightDiff)
    return {
      proportionCenterX,
      proportionCenterY: _proportionCenterY
    }
  }
}))
.actions(self => ({
  // interpreted as proportional position of the center of the label in cell coordinates
  setEquationCoords(coords: Point) {
    self.equationCoords = PointModel.create(coords)
    self.isV2Coords = undefined
  },
  setExtents({ labelWidth, labelHeight, plotWidth, plotHeight }: IExtents) {
    if (labelWidth) self.labelWidth = labelWidth
    if (labelHeight) self.labelHeight = labelHeight
    self.plotWidth = plotWidth
    self.plotHeight = plotHeight
  }
}))
export interface ILineLabelInstanceSnapshot extends SnapshotIn<typeof LineLabelInstance> {}
export interface ILineLabelInstance extends Instance<typeof LineLabelInstance> {}
