import {useEffect, useState} from "react"
import {kGraphClassSelector} from "../graphing-types"
import {AxisPlace} from "../models/axis-model"
import {useGraphLayoutContext} from "../models/graph-layout"

export const useAxisBounds = (place: AxisPlace) => {
  const layout = useGraphLayoutContext()
  return layout.getAxisBounds(place)
}

export const useAxisBoundsProvider = (place: AxisPlace) => {
  const layout = useGraphLayoutContext()
  const [graphElt, setGraphElt] = useState<HTMLDivElement | null>(null)
  const [wrapperElt, setWrapperElt] = useState<SVGGElement | null>(null)

  useEffect(() => {
    setGraphElt(wrapperElt?.closest(kGraphClassSelector) as HTMLDivElement ?? null)
  }, [wrapperElt])

  useEffect(() => {
    // track the bounds of the graph and axis elements
    let observer: ResizeObserver
    if (wrapperElt) {
      observer = new ResizeObserver(() => {
        const graphBounds = graphElt?.getBoundingClientRect()
        const axisBounds = wrapperElt.getBoundingClientRect()
        if (graphBounds && axisBounds) {
          layout.setAxisBounds(place, {
            left: axisBounds.left - graphBounds.left,
            top: axisBounds.top - graphBounds.top,
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
  }, [graphElt, layout, place, wrapperElt])

  return {graphElt, wrapperElt, setWrapperElt}
}
