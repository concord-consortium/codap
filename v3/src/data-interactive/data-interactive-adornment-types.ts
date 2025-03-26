import { SnapshotIn } from "@concord-consortium/mobx-state-tree"
import { CountAdornmentModel } from "../components/graph/adornments/count/count-adornment-model"
import { kCountType } from "../components/graph/adornments/count/count-adornment-types"
import { LSRLAdornmentModel } from "../components/graph/adornments/lsrl/lsrl-adornment-model"
import { kLSRLType } from "../components/graph/adornments/lsrl/lsrl-adornment-types"
import { MovableValueAdornmentModel } from "../components/graph/adornments/movable-value/movable-value-adornment-model"
import { kMovableValueType } from "../components/graph/adornments/movable-value/movable-value-adornment-types"

export type DICountAdornmentValues = Partial<SnapshotIn<typeof CountAdornmentModel>>
export type DILsrlAdornmentValues = Partial<SnapshotIn<typeof LSRLAdornmentModel>>
export type DIMovableValueAdornmentValues = Partial<SnapshotIn<typeof MovableValueAdornmentModel>>
export type DIAdornmentValues = DICountAdornmentValues | DILsrlAdornmentValues | DIMovableValueAdornmentValues

const adornmentTypes = new Set([kCountType, kLSRLType, kMovableValueType])

export const isAdornmentValues = (val: unknown): val is DIAdornmentValues => {
  return typeof val === "object" && val !== null && adornmentTypes.has((val as any).type)
}
