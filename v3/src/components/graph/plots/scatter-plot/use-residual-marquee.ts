import { ScaleLinear } from "d3"
import { useCallback, useRef } from "react"
import RTreeLib from "rtree"
import { Logger } from "../../../../lib/logger"
import { IDataSet } from "../../../../models/data/data-set"
import { selectAllCases, selectAndDeselectCases } from "../../../../models/data/data-set-utils"
import { rTreeRect } from "../../../data-display/data-display-types"
import { getCasesForDelta, rectNormalize } from "../../../data-display/data-display-utils"
import { MarqueeState } from "../../../data-display/models/marquee-state"
import { IAdornmentsBaseStore } from "../../adornments/store/adornments-base-store"
import { GraphLayout } from "../../models/graph-layout"
import { IGraphDataConfigurationModel } from "../../models/graph-data-configuration-model"
import { computeResiduals, getPredictor } from "./residual-plot-utils"
import { buildResidualPositions, clampRectToLowerRegion } from "./residual-marquee-utils"
import { scatterPlotFuncs } from "./scatter-plot-utils"

interface IUseResidualMarquee {
  layout: GraphLayout
  dataConfiguration?: IGraphDataConfigurationModel
  dataset?: IDataSet
  adornmentsStore: IAdornmentsBaseStore
  marqueeState?: MarqueeState
}

const kMarqueeDragThreshold = 3 // px of pointer travel before a press becomes a marquee drag

// Marquee (drag-rectangle) selection confined to the residual strip. Independent of the upper-plot
// marquee (which the shared Background owns): residual points are SVG circles the renderer doesn't
// know about, so this builds its own R-tree from the residual positions on pointerdown and selects
// via the same delta hit-testing. Dynamic while dragging; Shift adds to the current selection.
export function useResidualMarquee(props: IUseResidualMarquee) {
  const { layout, dataConfiguration, dataset, adornmentsStore, marqueeState } = props
  const treeRef = useRef<ReturnType<typeof RTreeLib> | null>(null)
  const startRef = useRef({ x: 0, y: 0 })
  const sizeRef = useRef({ w: 0, h: 0 })
  const prevRectRef = useRef<rTreeRect | undefined>(undefined)
  const needsClearRef = useRef(false)
  const draggingRef = useRef(false)
  const suppressClickRef = useRef(false)

  const onPointerDown = useCallback((event: React.PointerEvent<SVGRectElement>) => {
    if (!marqueeState || !adornmentsStore.showResidualPlot || !dataConfiguration || !dataset) return
    const lowerScale = layout.getAxisScale("leftLower") as ScaleLinear<number, number> | undefined
    if (!lowerScale) return
    const predictor = getPredictor(adornmentsStore, dataConfiguration)
    if (!predictor) return

    const { getXCoord } = scatterPlotFuncs(layout, dataConfiguration)
    const positions = buildResidualPositions(
      computeResiduals(dataConfiguration, predictor), getXCoord, layout.plotHeight, lowerScale)
    const tree = RTreeLib(10)
    positions.forEach(p => tree.insert({ x: p.x, y: p.y, w: 1, h: 1 }, { datasetID: dataset.id, caseID: p.caseID }))
    treeRef.current = tree

    // Window coords → plot-area frame (the frame the residual points are drawn in and the marquee
    // rect is rendered in — origin at the plot's left edge, inside the axes). Anchor to this hit
    // rect's own box: it is drawn at frame (0, plotHeight) in the same group as the residual points,
    // so its screen top-left maps to frame (0, plotHeight) regardless of the axis margins.
    const rectBounds = event.currentTarget.getBoundingClientRect()
    startRef.current = {
      x: event.clientX - rectBounds.left,
      y: event.clientY - rectBounds.top + layout.plotHeight
    }
    sizeRef.current = { w: 0, h: 0 }
    prevRectRef.current = undefined
    needsClearRef.current = !event.shiftKey
    draggingRef.current = false
    // Clear any stale suppression from a prior drag that ended without a trailing click (e.g. pointerup
    // off the rect), so suppression only ever applies to the click immediately following a drag.
    suppressClickRef.current = false

    const lowerBounds = layout.getLowerPlotBounds()
    const region = { top: layout.plotHeight, bottom: layout.plotHeight + lowerBounds.height, right: lowerBounds.width }

    const prev = { x: event.clientX, y: event.clientY }
    const onMove = (moveEvent: PointerEvent) => {
      sizeRef.current.w += moveEvent.clientX - prev.x
      sizeRef.current.h += moveEvent.clientY - prev.y
      prev.x = moveEvent.clientX
      prev.y = moveEvent.clientY
      if (!draggingRef.current &&
          Math.abs(sizeRef.current.w) < kMarqueeDragThreshold &&
          Math.abs(sizeRef.current.h) < kMarqueeDragThreshold) {
        return // below threshold: still a click, not a drag
      }
      draggingRef.current = true
      if (needsClearRef.current) {
        if (dataset.selection.size > 0) selectAllCases(dataset, false)
        needsClearRef.current = false
      }
      const rawRect = rectNormalize(
        { x: startRef.current.x, y: startRef.current.y, w: sizeRef.current.w, h: sizeRef.current.h })
      const rect = clampRectToLowerRegion(rawRect, region)
      marqueeState.setMarqueeRect({ x: rect.x, y: rect.y, width: rect.w, height: rect.h })
      const prevRect = prevRectRef.current ?? { x: rect.x, y: rect.y, w: 0, h: 0 }
      const entered = getCasesForDelta(treeRef.current, rect, prevRect)
      const exited = getCasesForDelta(treeRef.current, prevRect, rect)
      selectAndDeselectCases(entered.map(c => c.caseID), exited.map(c => c.caseID), dataset)
      prevRectRef.current = rect
    }

    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      // pointercancel (touch/gesture cancellation) also ends the drag, so the listeners and marquee
      // rect don't leak until a later pointerup that may never come.
      window.removeEventListener("pointercancel", onUp)
      marqueeState.setMarqueeRect({ x: 0, y: 0, width: 0, height: 0 })
      treeRef.current = null
      if (draggingRef.current) {
        suppressClickRef.current = true // the trailing click must not deselect what the drag selected
        const numCases = dataset.selection.size
        if (numCases > 0) Logger.log(`marqueeSelection: ${numCases}`, { numCases }, "plot")
      }
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
  }, [adornmentsStore, dataConfiguration, dataset, layout, marqueeState])

  const onClick = useCallback((event: React.MouseEvent<SVGRectElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (!event.shiftKey && !event.metaKey && !event.ctrlKey && dataset) {
      selectAllCases(dataset, false)
    }
  }, [dataset])

  return { onPointerDown, onClick }
}
