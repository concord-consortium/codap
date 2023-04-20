import { select, Selection } from "d3"
import { CaseData } from "./graphing-types"

// For proper typing of D3 callbacks, the initial selection must be typed appropriately.

// type arguments:
//  SVGCircleElement: type of element being selected
//  CaseData: type of data attached to selected element
//  SVGSVGElement: type of parent element selected by initial/global select
//  unknown: type of data attached to parent element (none in this case)
export type DotSelection = Selection<SVGCircleElement, CaseData, SVGSVGElement, unknown>

// selects all `circle` elements
export function selectCircles(svg: SVGSVGElement | undefined | null): DotSelection | null {
  return svg
          ? select(svg).selectAll("circle")
          : null
}

// selects all `.graph-dot` or `.graph-dot-highlighted` elements
export function selectDots(svg: SVGSVGElement | undefined | null, selectedOnly = false): DotSelection | null {
  const innerSelector = selectedOnly ? ".graph-dot-highlighted" : ".graph-dot"
  return svg
          ? select(svg).selectAll(innerSelector)
          : null
}
