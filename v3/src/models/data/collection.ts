import { getType, IAnyStateTreeNode, Instance, SnapshotIn, types } from "mobx-state-tree"
import { Attribute, IAttribute } from "./attribute"
import { typedId } from "../../utilities/js-utils"
import { IMoveAttributeOptions } from "./data-set-types"

export const CollectionLabels = types.model("CollectionLabels", {
  singleCase: "",
  pluralCase: "",
  singleCaseWithArticle: "",
  setOfCases: "",
  setOfCasesWithArticle: ""
})

export const CollectionPropsModel = types.model("CollectionProps", {
  id: types.optional(types.identifier, () => typedId("COLL")),
  name: "",
  title: "",
  labels: types.maybe(CollectionLabels)
})
.views(self => ({
  get displayTitle() {
    return self.title || self.name
  }
}))
.actions(self => ({
  setName(name: string) {
    self.name = name
  },
  setTitle(title: string) {
    self.title = title
  }
}))
export interface ICollectionPropsModel extends Instance<typeof CollectionPropsModel> {}

export const CollectionModel = CollectionPropsModel
.named("Collection")
.props({
  // grouping attributes in left-to-right order
  attributes: types.array(types.safeReference(Attribute))
})
.views(self => ({
  getAttribute(attrId: string) {
    return self.attributes.find(attr => attr?.id === attrId)
  },
  getAttributeIndex(attrId: string) {
    return self.attributes.findIndex(attr => attr?.id === attrId)
  },
  getAttributeByName(name: string) {
    return self.attributes.find(attribute => attribute?.name === name)
  }
}))
.actions(self => ({
  addAttribute(attr: IAttribute, options?: IMoveAttributeOptions) {
    const beforeIndex = options?.before ? self.getAttributeIndex(options.before) : -1
    const afterIndex = options?.after ? self.getAttributeIndex(options.after) : -1
    if (beforeIndex >= 0) {
      self.attributes.splice(beforeIndex, 0, attr)
    }
    else if (afterIndex >= 0) {
      self.attributes.splice(afterIndex + 1, 0, attr)
    }
    else {
      self.attributes.push(attr)
    }
  },
  removeAttribute(attrId: string) {
    const attr = self.getAttribute(attrId)
    attr && self.attributes.remove(attr)
  }
}))
.actions(self => ({
  moveAttribute(attrId: string, options?: IMoveAttributeOptions) {
    const attr = self.getAttribute(attrId)
    if (attr) {
      self.removeAttribute(attr.id)
      self.addAttribute(attr, options)
    }
  }
}))
export interface ICollectionModel extends Instance<typeof CollectionModel> {}
export interface ICollectionModelSnapshot extends SnapshotIn<typeof CollectionModel> {}

export function isCollectionModel(model?: IAnyStateTreeNode): model is ICollectionModel {
  return !!model && getType(model) === CollectionModel
}
