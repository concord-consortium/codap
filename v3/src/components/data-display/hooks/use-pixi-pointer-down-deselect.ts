import { selectAllCases } from "../../../models/data/data-set-utils"
import { IDataDisplayContentModel } from "../models/data-display-content-model"
import { PixiPointsCompatible, PixiPointsCompatibleArray } from "../renderer"
import { usePixiPointerDown } from "./use-pixi-pointer-down"

export function usePixiPointerDownDeselect(
  pixiPointsArray: PixiPointsCompatibleArray,
  model?: IDataDisplayContentModel
) {
  usePixiPointerDown(pixiPointsArray, (event, pixiPoints: PixiPointsCompatible) => {
    if (!event.shiftKey && !event.metaKey && !event.ctrlKey) {
      // requestAnimationFrame is available on both PixiPoints and PointRendererBase
      pixiPoints.requestAnimationFrame("deselectAll", () => {
        const datasetsArray = model?.datasetsArray ?? []
        datasetsArray.forEach(data => selectAllCases(data, false))
      })
    }
  })
}
