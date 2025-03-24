import { SnapshotIn } from "@concord-consortium/mobx-state-tree"
import { CountAdornmentModel } from "../components/graph/adornments/count/count-adornment-model"
import { LSRLAdornmentModel } from "../components/graph/adornments/lsrl/lsrl-adornment-model"
import { kCountType } from "../components/graph/adornments/count/count-adornment-types"
import { kLSRLType } from "../components/graph/adornments/lsrl/lsrl-adornment-types"

export type DICountAdornmentValues = Partial<SnapshotIn<typeof CountAdornmentModel>>
type DILSRLAdornmentValues = Partial<SnapshotIn<typeof LSRLAdornmentModel>>

export type DIAdornmentValues = DICountAdornmentValues | DILSRLAdornmentValues

const adornmentTypes = new Set([kCountType, kLSRLType])

export const isAdornmentValues = (val: unknown): val is DIAdornmentValues => {
  return typeof val === "object" && val !== null && adornmentTypes.has((val as any).type)
}
