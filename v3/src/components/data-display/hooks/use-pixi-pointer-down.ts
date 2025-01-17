import { useEffect } from "react"
import { useTileSelectionContext } from "../../../hooks/use-tile-selection-context"
import { PixiPoints, PixiPointsArray } from "../pixi/pixi-points"

type OnPointerDownCallback = (event: PointerEvent, pixiPoints: PixiPoints) => void

export function usePixiPointerDown(pixiPointsArray: PixiPointsArray, onPointerDown: OnPointerDownCallback) {
  const { isTileSelected } = useTileSelectionContext()

  useEffect(() => {
    const handlePointerDownCapture = (event: PointerEvent) => {
      // Browser events are dispatched directly to the PIXI canvas.
      // Re-dispatched events are dispatched to elements behind the PIXI canvas.
      const pixiPointsIndex = pixiPointsArray.findIndex(pixiPoints => event.target === pixiPoints?.canvas)
      // first click selects tile; deselection only occurs once the tile is already selected
      if (pixiPointsIndex >= 0 && pixiPointsArray[pixiPointsIndex] && isTileSelected()) {
        onPointerDown(event, pixiPointsArray[pixiPointsIndex])
      }
    }
    window.addEventListener("pointerdown", handlePointerDownCapture, { capture: true })
    return () => window.removeEventListener("pointerdown", handlePointerDownCapture, { capture: true })
  }, [isTileSelected, onPointerDown, pixiPointsArray])

}
