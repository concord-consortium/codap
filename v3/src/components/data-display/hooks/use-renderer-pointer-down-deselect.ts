import { selectAllCases } from "../../../models/data/data-set-utils"
import { preservesSelection } from "../../../utilities/platform-utils"
import { IDataDisplayContentModel } from "../models/data-display-content-model"
import { PointRendererArray, PointRendererBase } from "../renderer"
import { useRendererPointerDown } from "./use-renderer-pointer-down"

export function useRendererPointerDownDeselect(
  rendererArray: PointRendererArray,
  model?: IDataDisplayContentModel
) {
  useRendererPointerDown(rendererArray, (event, renderer: PointRendererBase) => {
    if (!preservesSelection(event)) {
      renderer.requestAnimationFrame("deselectAll", () => {
        const datasetsArray = model?.datasetsArray ?? []
        datasetsArray.forEach(data => selectAllCases(data, false))
      })
    }
  })
}
