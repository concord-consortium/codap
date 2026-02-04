import { selectAllCases } from "../../../models/data/data-set-utils"
import { IDataDisplayContentModel } from "../models/data-display-content-model"
import { PointRendererArray, PointRendererBase } from "../renderer"
import { useRendererPointerDown } from "./use-renderer-pointer-down"

export function useRendererPointerDownDeselect(
  rendererArray: PointRendererArray,
  model?: IDataDisplayContentModel
) {
  useRendererPointerDown(rendererArray, (event, renderer: PointRendererBase) => {
    if (!event.shiftKey && !event.metaKey && !event.ctrlKey) {
      renderer.requestAnimationFrame("deselectAll", () => {
        const datasetsArray = model?.datasetsArray ?? []
        datasetsArray.forEach(data => selectAllCases(data, false))
      })
    }
  })
}
