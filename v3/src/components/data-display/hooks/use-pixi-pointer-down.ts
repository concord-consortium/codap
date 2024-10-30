import { useEffect } from "react"
import { useTileModelContext } from "../../../hooks/use-tile-model-context"
import { PixiPoints } from "../pixi/pixi-points"

export function usePixiPointerDown(pixiPointsArray: PixiPoints[], onPointerDown: (event: PointerEvent) => void) {
  const { isTileSelected } = useTileModelContext()

  useEffect(() => {
    const handlePointerDownCapture = (event: PointerEvent) => {
      // Browser events are dispatched directly to the PIXI canvas.
      // Re-dispatched events are dispatched to elements behind the PIXI canvas.
      const canvases: Array<EventTarget | null> = pixiPointsArray.map(pixiPoints => pixiPoints.canvas)
      const isBrowserEventOnPixiCanvas = canvases.includes(event.target)
      // first click selects tile; deselection only occurs once the tile is already selected
      if (isBrowserEventOnPixiCanvas && isTileSelected()) {
        onPointerDown(event)
      }
    }
    window.addEventListener("pointerdown", handlePointerDownCapture, { capture: true })
    return () => window.removeEventListener("pointerdown", handlePointerDownCapture, { capture: true })
  }, [isTileSelected, onPointerDown, pixiPointsArray])

}
