import {useEffect, useState} from "react"
import {AxisPlace} from "../axis-types"
import {useGraphLayoutContext} from "../../graph/models/graph-layout"

export const useAxisBounds = (place: AxisPlace) => {
  const layout = useGraphLayoutContext()
  return layout.getAxisBounds(place)
}

export const useAxisBoundsProvider = (place: AxisPlace, parentSelector: string) => {
  const layout = useGraphLayoutContext()
  const [parentElt, setParentElt] = useState<HTMLDivElement | null>(null)
  const [wrapperElt, setWrapperElt] = useState<SVGGElement | null>(null)

  useEffect(() => {
    setParentElt(wrapperElt?.closest(parentSelector) as HTMLDivElement ?? null)
  }, [parentSelector, wrapperElt])

  useEffect(() => {
    // track the bounds of the graph and axis elements
    let observer: ResizeObserver
    if (wrapperElt) {
      observer = new ResizeObserver(() => {
        const parentBounds = parentElt?.getBoundingClientRect()
        const axisBounds = wrapperElt.getBoundingClientRect()
        if (parentBounds && axisBounds) {
          layout.setAxisBounds(place, {
            left: axisBounds.left - parentBounds.left,
            top: axisBounds.top - parentBounds.top,
            width: axisBounds.width,
            height: axisBounds.height
          })
        }
      })
      observer.observe(wrapperElt)
    } else {
      layout.setAxisBounds(place, undefined)
    }

    return () => observer?.disconnect()
  }, [parentElt, layout, place, wrapperElt])

  return {parentElt, wrapperElt, setWrapperElt}
}
