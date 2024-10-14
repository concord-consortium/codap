import { useEffect } from "react"
import { useTileModelContext } from "../../../hooks/use-tile-model-context"
import { selectAllCases } from "../../../models/data/data-set-utils"
import { IDataDisplayContentModel } from "../models/data-display-content-model"

export function usePointerDownCapture(dataDisplayModel?: IDataDisplayContentModel) {
  const { isTileSelected } = useTileModelContext()

  useEffect(() => {
    const handlePointerDownCapture = (event: PointerEvent) => {
      const isWindowEvent = event.target instanceof HTMLCanvasElement
      if (isWindowEvent && !event.shiftKey && isTileSelected()) {
        const datasetsArray = dataDisplayModel?.datasetsArray ?? []
        datasetsArray.forEach(data => selectAllCases(data, false))
      }
    }
    window.addEventListener("pointerdown", handlePointerDownCapture, { capture: true })
    return () => window.removeEventListener("pointerdown", handlePointerDownCapture, { capture: true })
  }, [dataDisplayModel?.datasetsArray, isTileSelected])

}
