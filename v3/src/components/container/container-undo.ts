import { IAnyStateTreeNode } from "mobx-state-tree"
import { ICustomPatch } from "../../models/history/tree-types"
import { ICustomUndoRedoPatcher } from "../../models/history/custom-undo-redo-registry"
import { IDocumentModel } from "../../models/document/document"
import { animateEaseInOut, ComponentRect, kDefaultAnimationDuration } from "../../utilities/animation-utils"
import { isFreeTileRow } from "../../models/document/free-tile-row"

export interface ISetPositionSizeCustomPatch extends ICustomPatch {
  type: "Container.setPositionSize"
  data: {
    tileId: string
    before: ComponentRect
    after: ComponentRect
  }
}
function isSetPositionSizeCustomPatch(patch: ICustomPatch): patch is ISetPositionSizeCustomPatch {
  return patch.type === "Container.setPositionSize"
}

function animateFromTo(node: IAnyStateTreeNode, patch: ICustomPatch, from: ComponentRect, to: ComponentRect) {
  if (isSetPositionSizeCustomPatch(patch)) {
    const document = node as IDocumentModel,
      row = document.content?.getRowByIndex(0)
    if (isFreeTileRow(row)) {
      const tile = row?.getNode(patch.data.tileId)
      animateEaseInOut(kDefaultAnimationDuration, from, to, (rect: ComponentRect) => {
        tile?.setPosition(rect.x, rect.y)
        tile?.setSize(rect.width, rect.height)
      })
    }
  }
}

export const setContainerPositionSizeCustomUndoRedo: ICustomUndoRedoPatcher = {
  undo: (node: IAnyStateTreeNode, patch: ICustomPatch) => {
    animateFromTo(node, patch, patch.data.after, patch.data.before)
  },
  redo: (node: IAnyStateTreeNode, patch: ICustomPatch) => {
    animateFromTo(node, patch, patch.data.before, patch.data.after)
  }
}
