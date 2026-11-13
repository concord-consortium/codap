import { useEffect } from "react"
import { useMap } from "react-leaflet"
import { kPoweredByEsriAttribution } from "../map-types"

// Leaflet's own separator between the prefix and the layer attributions
const kAttributionSeparator = ' <span aria-hidden="true">|</span> '

interface IProps {
  show: boolean
}

/**
 * Adds "Powered by Esri" to the Leaflet attribution control's prefix while `show` is true, and restores the original
 * prefix otherwise. Also makes the attribution control focusable so keyboard and touch users can expand the (truncated)
 * attribution text.
 */
export function EsriAttributionPrefix({ show }: IProps) {
  const map = useMap()

  // Make the attribution focusable.
  useEffect(() => {
    const container = map.attributionControl?.getContainer()
    container?.setAttribute("tabindex", "0")
  }, [map])

  // Add the Esri attribution to Leaflet's attribution prefix.
  useEffect(() => {
    const control = map.attributionControl
    if (!show || !control) return

    const defaultPrefix = control.options.prefix
    const esriPrefix = typeof defaultPrefix === "string" && defaultPrefix
      ? `${defaultPrefix}${kAttributionSeparator}${kPoweredByEsriAttribution}`
      : kPoweredByEsriAttribution
    control.setPrefix(esriPrefix)

    return () => {
      control.setPrefix(typeof defaultPrefix === "string" ? defaultPrefix : false)
    }
  }, [map, show])

  return null
}
