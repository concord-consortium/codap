import { IAnyStateTreeNode } from "mobx-state-tree"
import { IDocumentContentModel } from "../models/document/document-content"
import { getParentWithTypeName } from "./mst-utils"

export function getDocumentContentFromNode(target: IAnyStateTreeNode): IDocumentContentModel | undefined {
  return getParentWithTypeName(target, "DocumentContent") as IDocumentContentModel
}
