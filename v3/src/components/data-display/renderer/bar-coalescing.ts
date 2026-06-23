import { IPointState } from "./point-renderer-types"

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
 * Maps a renderer point state to a bar piece, or undefined when the point is not a drawable bar
 * (hidden, or missing width/height). Shared by the Canvas and Pixi renderers so the visibility
 * guard and the `strokeOpacity` default stay in one place.
 */
export function pointStateToBarPiece(p: IPointState): IBarPiece | undefined {
  const { style } = p
  if (!p.isVisible || style.width == null || style.height == null) return undefined
  return {
    x: p.x, y: p.y, scale: p.scale,
    width: style.width, height: style.height,
    fill: style.fill, stroke: style.stroke,
    strokeWidth: style.strokeWidth, strokeOpacity: style.strokeOpacity ?? 0.4
  }
}

/**
 * Top-left corner and scaled size of an anchored bar rectangle. `anchor` is the fraction of the
 * scaled width/height sitting left of / above (x, y): {0,0} = top-left anchored, {0.5,0.5} =
 * centered. Shared by bar rendering (coalesceBarRuns) and bar hit-testing (canvas-hit-tester) so
 * the drawn rect and its hit region use the same geometry. See CODAP-1234.
 */
export function anchoredBarRect(
  x: number, y: number, width: number, height: number, scale: number, anchor: { x: number; y: number }
): { left: number; top: number; width: number; height: number } {
  const w = width * scale
  const h = height * scale
  return { left: x - anchor.x * w, top: y - anchor.y * h, width: w, height: h }
}

/**
 * Two pieces coalesce only when they render identically: same fill AND same stroke style. Without a
 * legend, selection is encoded in the fill (selected cases get a distinct fill); with a legend the
 * fill stays the legend color and selection is encoded only in the stroke. Grouping by fill alone
 * would therefore merge a selected case into an adjacent unselected same-color case and drop its
 * selection stroke, making the selection invisible. See CODAP-1234.
 */
function sameRunStyle(a: IBarPiece, b: IBarPiece): boolean {
  return a.fill === b.fill && a.stroke === b.stroke &&
    a.strokeWidth === b.strokeWidth && a.strokeOpacity === b.strokeOpacity
}

/**
 * Merge a single bar's per-case rectangles ("pieces") into one rectangle per contiguous same-style
 * run (same fill and stroke; see `sameRunStyle`). Bars are drawn as a stack of per-case rects so
 * selected cases can be shown distinctly, but drawing each case as its own rect produces undesirable
 * per-case separator lines and, when the rects are sub-pixel-thin, washes the fill out (abutting
 * sub-pixel opaque rects composite to <100% opacity under coverage-based anti-aliasing). Coalescing
 * same-style runs yields solid segments with strokes only at meaningful boundaries (selection
 * changes and the bar outline).
 *
 * Pieces must all belong to the same bar. `stackAxis` is the axis along which the cases stack:
 * "y" for vertical bars (primary/categorical axis on the bottom) and "x" for horizontal bars
 * (primary axis on the left). Pieces are sorted along the stack axis (in place — callers pass a
 * throwaway per-bar array) and each run is extended along it, keeping the cross-axis position/size
 * constant. Each run carries the stroke style of its first piece (uniform within a run, since the
 * run only spans same-style pieces). See CODAP-1234.
 */
export function coalesceBarRuns(
  barPieces: IBarPiece[], anchor: { x: number; y: number }, stackAxis: "x" | "y" = "y"
): IBarRun[] {
  const sorted = barPieces.sort((a, b) => a[stackAxis] - b[stackAxis])
  const runs: IBarRun[] = []
  let i = 0
  while (i < sorted.length) {
    const p0 = sorted[i]
    const { fill, stroke, strokeWidth, strokeOpacity } = p0
    const { left: left0, top: top0, width: w0, height: h0 } =
      anchoredBarRect(p0.x, p0.y, p0.width, p0.height, p0.scale, anchor)
    // the run grows along the stack axis (start..end); the cross axis stays as p0's
    let start = stackAxis === "y" ? top0 : left0
    let end = start + (stackAxis === "y" ? h0 : w0)
    let j = i + 1
    while (j < sorted.length && sameRunStyle(sorted[j], p0)) {
      const pj = sorted[j]
      const { left: leftj, top: topj, width: wj, height: hj } =
        anchoredBarRect(pj.x, pj.y, pj.width, pj.height, pj.scale, anchor)
      const startj = stackAxis === "y" ? topj : leftj
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
 * Groups a flat list of bar pieces into bars and coalesces each bar's same-style runs, returning
 * all runs across all bars. Shared by the Canvas and Pixi renderers; each renderer maps its own
 * point state into `IBarPiece`s and draws the returned runs.
 *
 * `stackAxis` is the axis the cases stack along ("y" for vertical bars, "x" for horizontal); bars
 * are keyed by the cross axis (the primary/categorical coordinate). The exact coordinate is used
 * as the key — all cases in one fused bar share an identical computed value — which avoids merging
 * distinct, sub-pixel-spaced bars that rounding to an integer key would collapse together.
 *
 * This relies on every case in a bar computing a bit-identical cross-axis coordinate (they do: it
 * comes from one scale call on the shared category value). If that ever stopped holding, the bar
 * would split into adjacent runs (a hairline seam, the per-case washout this module fixes) — but do
 * NOT add a tolerance to the key to paper over it: a tolerance would instead merge genuinely
 * distinct, sub-pixel-spaced bars. Tag pieces with a per-bar identity key instead.
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
