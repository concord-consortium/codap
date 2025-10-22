import { createContext, useContext } from "react"
import { LeafletMapLayers } from "../models/leaflet-map-layers"

export const LeafletMapLayersContext = createContext<Maybe<LeafletMapLayers>>(undefined)

export function useLeafletMapLayers() {
  return useContext(LeafletMapLayersContext)
}
