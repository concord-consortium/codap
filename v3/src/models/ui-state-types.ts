export const RulerStateKeys = ["measuresOfCenter", "measuresOfSpread", "boxPlotAndNormalCurve", "otherValues"] as const
export type RulerStateKey = typeof RulerStateKeys[number]

export type RulerState = Record<RulerStateKey, boolean>
