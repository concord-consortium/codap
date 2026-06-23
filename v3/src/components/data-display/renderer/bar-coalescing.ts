export interface IBarPiece {
  x: number
  y: number
  scale: number
  width: number
  height: number
  fill: string
  stroke: string
  strokeWidth: number
  strokeOpacity: number
}

export interface IBarRun {
  left: number
  top: number
  width: number
  height: number
  fill: string
  stroke: string
  strokeWidth: number
  strokeOpacity: number
}

/**
 * Merge a single bar's per-case rectangles ("pieces") into one rectangle per contiguous same-fill
 * run. Bars are drawn as a stack of per-case rects so selected cases can be shown distinctly, but
 * drawing each case as its own rect produces undesirable per-case separator lines and, when the
 * rects are sub-pixel-thin, washes the fill out (abutting sub-pixel opaque rects composite to
 * <100% opacity under coverage-based anti-aliasing). Coalescing same-fill runs yields solid
 * segments with strokes only at meaningful boundaries (selection changes and the bar outline).
 *
 * Pieces must all belong to the same bar. `stackAxis` is the axis along which the cases stack:
 * "y" for vertical bars (primary/categorical axis on the bottom) and "x" for horizontal bars
 * (primary axis on the left). Pieces are sorted along the stack axis and each run is extended
 * along it, keeping the cross-axis position/size constant. Each run carries the stroke style of
 * its first piece (uniform within a run, since the fill encodes selection/legend state).
 * See CODAP-1234.
 */
export function coalesceBarRuns(
  barPieces: IBarPiece[], anchor: { x: number; y: number }, stackAxis: "x" | "y" = "y"
): IBarRun[] {
  const sorted = [...barPieces].sort((a, b) => a[stackAxis] - b[stackAxis])
  const runs: IBarRun[] = []
  let i = 0
  while (i < sorted.length) {
    const p0 = sorted[i]
    const { fill, stroke, strokeWidth, strokeOpacity } = p0
    const w0 = p0.width * p0.scale
    const h0 = p0.height * p0.scale
    const left0 = p0.x - anchor.x * w0
    const top0 = p0.y - anchor.y * h0
    // the run grows along the stack axis (start..end); the cross axis stays as p0's
    let start = stackAxis === "y" ? top0 : left0
    let end = start + (stackAxis === "y" ? h0 : w0)
    let j = i + 1
    while (j < sorted.length && sorted[j].fill === fill) {
      const pj = sorted[j]
      const wj = pj.width * pj.scale
      const hj = pj.height * pj.scale
      const startj = stackAxis === "y" ? pj.y - anchor.y * hj : pj.x - anchor.x * wj
      start = Math.min(start, startj)
      end = Math.max(end, startj + (stackAxis === "y" ? hj : wj))
      j++
    }
    runs.push(stackAxis === "y"
      ? { left: left0, top: start, width: w0, height: end - start, fill, stroke, strokeWidth, strokeOpacity }
      : { left: start, top: top0, width: end - start, height: h0, fill, stroke, strokeWidth, strokeOpacity })
    i = j
  }
  return runs
}

/**
 * Groups a flat list of bar pieces into bars and coalesces each bar's same-fill runs, returning
 * all runs across all bars. Shared by the Canvas and Pixi renderers; each renderer maps its own
 * point state into `IBarPiece`s and draws the returned runs.
 *
 * `stackAxis` is the axis the cases stack along ("y" for vertical bars, "x" for horizontal); bars
 * are keyed by the cross axis (the primary/categorical coordinate). The exact coordinate is used
 * as the key — all cases in one fused bar share an identical computed value — which avoids merging
 * distinct, sub-pixel-spaced bars that rounding to an integer key would collapse together.
 */
export function coalesceBars(
  barPieces: IBarPiece[], anchor: { x: number; y: number }, stackAxis: "x" | "y" = "y"
): IBarRun[] {
  const keyAxis = stackAxis === "y" ? "x" : "y"
  const piecesByBar = new Map<number, IBarPiece[]>()
  for (const piece of barPieces) {
    const key = piece[keyAxis]
    const bar = piecesByBar.get(key) ?? []
    bar.push(piece)
    piecesByBar.set(key, bar)
  }
  const runs: IBarRun[] = []
  piecesByBar.forEach(bar => runs.push(...coalesceBarRuns(bar, anchor, stackAxis)))
  return runs
}
