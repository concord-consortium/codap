import { drag, pointer } from "d3"
import { IBarCover } from "../../graphing-types"
import { BinDetails } from "../binned-dot-plot/bin-details"

export const kEdgeThreshold = 6 // pixels from bar edge to trigger resize cursor/drag

export interface INearBinBoundaryOptions {
  binDetails: Pick<BinDetails, "binWidth" | "minBinEdge" | "totalNumberOfBins">
  primaryIsBottom: boolean
  numRepetitions: number
  primaryLength: number
  primaryAxisScale: (value: number) => number
}

/**
 * Given a mouse or touch event on a bar cover, determine if it is near a draggable bin boundary edge.
 * Returns the bin boundary index (for use with binDetails.getBinEdge) or -1 if not near an edge.
 */
export function getNearBinBoundaryIndex(
  event: MouseEvent | TouchEvent, container: Element, options: INearBinBoundaryOptions
) {
  const { binDetails, primaryIsBottom, numRepetitions, primaryLength, primaryAxisScale } = options
  const { binWidth, minBinEdge, totalNumberOfBins } = binDetails
  if (binWidth === undefined) return -1
  // d3's `pointer()` reads clientX/clientY, which a TouchEvent lacks; its touches carry them instead.
  const source = "changedTouches" in event ? event.changedTouches[0] : event
  if (!source) return -1
  const [mx, my] = pointer(source, container)
  const mousePos = primaryIsBottom ? mx : my
  const bandWidth = primaryLength / numRepetitions
  for (let repetition = 0; repetition < numRepetitions; repetition++) {
    for (let binNumber = 1; binNumber < totalNumberOfBins; binNumber++) {
      const boundaryPos = repetition * bandWidth +
        primaryAxisScale(minBinEdge + binNumber * binWidth) / numRepetitions
      if (Math.abs(mousePos - boundaryPos) <= kEdgeThreshold) {
        // Return the bin index to the left of this boundary (same convention as binned dot plot)
        return binNumber - 1
      }
    }
  }
  return -1
}

export interface IBinBoundaryDragHandlers {
  filter: (event: MouseEvent | TouchEvent) => boolean
  start: (event: MouseEvent) => void
  drag: (event: MouseEvent) => void
  end: () => void
}

/**
 * Creates the d3 drag behavior for dragging bin boundaries from a histogram's bar covers.
 */
export function createBinBoundaryDrag({ filter, start, drag: onDrag, end }: IBinBoundaryDragHandlers) {
  return drag<SVGRectElement, IBarCover>()
    // d3's default subject is the bar's datum, whose x/y are the bar's origin, which would make the drag's
    // x/y the bar's origin plus the pointer's movement rather than the pointer's position.
    .subject((event: { x: number, y: number }) => ({ x: event.x, y: event.y }))
    .filter((event: MouseEvent | TouchEvent) => filter(event))
    .on("start", (event: MouseEvent) => start(event))
    .on("drag", (event: MouseEvent) => onDrag(event))
    .on("end", () => end())
}
