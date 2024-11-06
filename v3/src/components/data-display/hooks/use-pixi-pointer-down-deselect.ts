import { selectAllCases } from "../../../models/data/data-set-utils"
import { IDataDisplayContentModel } from "../models/data-display-content-model"
import { PixiPoints } from "../pixi/pixi-points"
import { usePixiPointerDown } from "./use-pixi-pointer-down"

export function usePixiPointerDownDeselect(pixiPointsArray: PixiPoints[], model?: IDataDisplayContentModel) {
  usePixiPointerDown(pixiPointsArray, (event, pixiPoints: PixiPoints) => {
    if (!event.shiftKey && !event.metaKey && !event.ctrlKey) {
      pixiPoints.requestAnimationFrame("deselectAll", () => {
        const datasetsArray = model?.datasetsArray ?? []
        datasetsArray.forEach(data => selectAllCases(data, false))
      })
    }
  })
}
