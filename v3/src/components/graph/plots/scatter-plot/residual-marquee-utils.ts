import { rTreeRect } from "../../../data-display/data-display-types"
import { IResidualPoint } from "./residual-plot-utils"

export interface IResidualPosition {
  caseID: string
  x: number
  y: number
}

// Screen position of each residual point, in the graph-SVG coordinate frame: x from the shared
// getXCoord, y on the lower axis (plotHeight is the top of the residual region). Mirrors the cx/cy
// used to draw the residual circles, so the hit-test index and the drawn points agree by construction.
export function buildResidualPositions(
  residuals: IResidualPoint[], getXCoord: (caseID: string) => number,
  plotHeight: number, lowerScale: (residual: number) => number
): IResidualPosition[] {
  const positions: IResidualPosition[] = []
  residuals.forEach(r => {
    const x = getXCoord(r.caseID)
    const y = plotHeight + lowerScale(r.residual)
    if (isFinite(x) && isFinite(y)) positions.push({ caseID: r.caseID, x, y })
  })
  return positions
}

// The region's left edge is always 0, so it isn't carried here: the residual hit rect is drawn at
// x=0 in the same group as the residual points, which puts the frame's origin at the plot's left edge.
export interface ILowerRegion {
  top: number
  bottom: number
  right: number
}

// Clamp a normalized rect to the residual region so the marquee can neither extend into the upper
// plot nor past the plot edges. Keeps the visible rect and the hit-test rect identical.
export function clampRectToLowerRegion(rect: rTreeRect, region: ILowerRegion): rTreeRect {
  const left = Math.max(0, rect.x)
  const top = Math.max(region.top, rect.y)
  const right = Math.min(region.right, rect.x + rect.w)
  const bottom = Math.min(region.bottom, rect.y + rect.h)
  return { x: left, y: top, w: Math.max(0, right - left), h: Math.max(0, bottom - top) }
}
