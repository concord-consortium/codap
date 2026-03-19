import { useCallback, useEffect, useRef } from "react"
import { Map as LeafletMap } from "leaflet"
import { kDoubleClickDelay } from "../../constants"

/**
 * Hook that wraps click handlers on map layers (points, polygons, pins) to
 * distinguish single-clicks from double-clicks. Single-clicks are delayed
 * by kDoubleClickDelay ms; double-clicks cancel the pending single-click
 * and trigger a Leaflet zoom instead (shift+double-click zooms out).
 */
export function useMapClickWithDoubleClickZoom(leafletMap: LeafletMap | undefined) {
  const pendingClickRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastClickTimeRef = useRef(0)

  const wrapClickHandler = useCallback((onClick: () => void, event: MouseEvent) => {
    const now = Date.now()
    const timeSinceLastClick = now - lastClickTimeRef.current
    lastClickTimeRef.current = now

    if (timeSinceLastClick < kDoubleClickDelay && pendingClickRef.current != null) {
      // If second click is within double-click window, cancel pending single-click and zoom instead.
      clearTimeout(pendingClickRef.current)
      pendingClickRef.current = null

      if (leafletMap) {
        const containerPoint = leafletMap.mouseEventToContainerPoint(event)
        const latlng = leafletMap.containerPointToLatLng(containerPoint)
        const currentZoom = leafletMap.getZoom()
        const delta = event.shiftKey ? -1 : 1
        leafletMap.setZoomAround(latlng, currentZoom + delta)
      }
    } else {
      // On first click, schedule the single-click action.
      if (pendingClickRef.current != null) {
        clearTimeout(pendingClickRef.current)
      }
      pendingClickRef.current = setTimeout(() => {
        pendingClickRef.current = null
        onClick()
      }, kDoubleClickDelay)
    }
  }, [leafletMap])

  // Clean up any pending timeout on unmount.
  useEffect(() => {
    return () => {
      if (pendingClickRef.current != null) {
        clearTimeout(pendingClickRef.current)
      }
    }
  }, [])

  return { wrapClickHandler }
}
