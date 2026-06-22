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
 * rects are sub-pixel-tall, washes the fill out (abutting sub-pixel opaque rects composite to
 * <100% opacity under coverage-based anti-aliasing). Coalescing same-fill runs yields solid
 * segments with strokes only at meaningful boundaries (selection changes and the bar outline).
 *
 * Pieces must all belong to the same bar (shared primary coord); they are sorted by ascending y
 * (top→bottom). Each run carries the stroke style of its first piece (uniform within a run, since
 * the fill encodes selection/legend state). See CODAP-1234.
 */
export function coalesceBarRuns(barPieces: IBarPiece[], anchor: { x: number; y: number }): IBarRun[] {
  const sorted = [...barPieces].sort((a, b) => a.y - b.y)
  const runs: IBarRun[] = []
  let i = 0
  while (i < sorted.length) {
    const p0 = sorted[i]
    const { fill, stroke, strokeWidth, strokeOpacity } = p0
    const width = p0.width * p0.scale
    const left = p0.x - anchor.x * width
    let top = p0.y - anchor.y * p0.height * p0.scale
    let bottom = top + p0.height * p0.scale
    let j = i + 1
    while (j < sorted.length && sorted[j].fill === fill) {
      const pj = sorted[j]
      const t = pj.y - anchor.y * pj.height * pj.scale
      top = Math.min(top, t)
      bottom = Math.max(bottom, t + pj.height * pj.scale)
      j++
    }
    runs.push({ left, top, width, height: bottom - top, fill, stroke, strokeWidth, strokeOpacity })
    i = j
  }
  return runs
}

/**
 * Groups a flat list of bar pieces into bars by their shared primary (x) coordinate and coalesces
 * each bar's same-fill runs, returning all runs across all bars. Shared by the Canvas and Pixi
 * renderers; each renderer maps its own point state into `IBarPiece`s and draws the returned runs.
 */
export function coalesceBars(barPieces: IBarPiece[], anchor: { x: number; y: number }): IBarRun[] {
  const piecesByBar = new Map<number, IBarPiece[]>()
  for (const piece of barPieces) {
    const key = Math.round(piece.x)
    const bar = piecesByBar.get(key) ?? []
    bar.push(piece)
    piecesByBar.set(key, bar)
  }
  const runs: IBarRun[] = []
  piecesByBar.forEach(bar => runs.push(...coalesceBarRuns(bar, anchor)))
  return runs
}
