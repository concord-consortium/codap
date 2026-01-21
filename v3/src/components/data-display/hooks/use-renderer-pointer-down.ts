import { useEffect } from "react"
import { useTileSelectionContext } from "../../../hooks/use-tile-selection-context"
import { PointRendererArray, PointRendererBase } from "../renderer"

type OnPointerDownCallback = (event: PointerEvent, renderer: PointRendererBase) => void

export function useRendererPointerDown(rendererArray: PointRendererArray, onPointerDown: OnPointerDownCallback) {
  const { isTileSelected } = useTileSelectionContext()

  useEffect(() => {
    const handlePointerDownCapture = (event: PointerEvent) => {
      // Browser events are dispatched directly to the PIXI canvas.
      // Re-dispatched events are dispatched to elements behind the PIXI canvas.
      const rendererIndex = rendererArray.findIndex(renderer => event.target === renderer?.canvas)
      // first click selects tile; deselection only occurs once the tile is already selected
      const foundRenderer = rendererArray[rendererIndex]
      if (rendererIndex >= 0 && foundRenderer && isTileSelected()) {
        onPointerDown(event, foundRenderer)
      }
    }
    window.addEventListener("pointerdown", handlePointerDownCapture, { capture: true })
    return () => window.removeEventListener("pointerdown", handlePointerDownCapture, { capture: true })
  }, [isTileSelected, onPointerDown, rendererArray])

}
