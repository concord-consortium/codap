export type ForcedRendererType = "webgl" | "canvas" | null

export function computeEffectiveForcedRendererType(
  disableGraphicsAcceleration: boolean | undefined,
  debugForcedType: ForcedRendererType
): ForcedRendererType {
  if (disableGraphicsAcceleration) return "canvas"
  return debugForcedType
}
