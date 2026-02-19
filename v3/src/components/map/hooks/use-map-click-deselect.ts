import { useCallback, useEffect, useRef } from "react"
import { selectAllCases } from "../../../models/data/data-set-utils"
import { useTileSelectionContext } from "../../../hooks/use-tile-selection-context"
import { IMapContentModel } from "../models/map-content-model"

/**
 * Deselects all cases when the user clicks on the Leaflet map background
 * (empty area with no point or polygon). Only deselects if the map tile
 * was already selected before the click (first click just focuses the tile).
 */
export function useMapClickDeselect(mapModel: IMapContentModel) {
  const { isTileSelected } = useTileSelectionContext()
  // Track whether tile was selected before the current pointer interaction.
  // Tile selection happens in pointerdown bubble phase; we capture the state
  // in the capture phase (which fires first) so we know whether this is a
  // "first click to focus" or a "subsequent click to deselect".
  const wasTileSelectedRef = useRef(false)

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      // Only capture state from real browser events. When the Pixi canvas
      // re-dispatches a pointerdown to underlying elements, isTrusted is false.
      // Without this guard the re-dispatched event overwrites our ref after
      // the tile has already been selected by the original bubble phase.
      if (!event.isTrusted) return
      wasTileSelectedRef.current = isTileSelected()
    }
    window.addEventListener("pointerdown", handlePointerDown, { capture: true })
    return () => window.removeEventListener("pointerdown", handlePointerDown, { capture: true })
  }, [isTileSelected])

  const handleMapClick = useCallback((event: MouseEvent) => {
    if (!wasTileSelectedRef.current) return
    if (mapModel._ignoreLeafletClicks) return
    if (event.shiftKey || event.metaKey || event.ctrlKey) return

    const datasetsArray = mapModel.datasetsArray
    datasetsArray.forEach(data => selectAllCases(data, false))
  }, [mapModel])

  useEffect(() => {
    mapModel.leafletMapState.setOnClickCallback(handleMapClick)
    return () => mapModel.leafletMapState.setOnClickCallback(undefined)
  }, [mapModel, handleMapClick])
}
