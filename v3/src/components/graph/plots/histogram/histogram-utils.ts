import { pointer } from "d3"
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
