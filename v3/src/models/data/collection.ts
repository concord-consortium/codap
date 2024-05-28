import { getType, IAnyStateTreeNode, Instance, SnapshotIn, types } from "mobx-state-tree"
import { Attribute, IAttribute } from "./attribute"
import { IMoveAttributeOptions } from "./data-set-types"
import { V2Model } from "./v2-model"
import { kCollectionIdPrefix, typeV3Id } from "../../utilities/codap-utils"

export const CollectionLabels = types.model("CollectionLabels", {
  singleCase: "",
  pluralCase: "",
  singleCaseWithArticle: "",
  setOfCases: "",
  setOfCasesWithArticle: ""
})
export interface ICollectionLabels extends Instance<typeof CollectionLabels> {}

export const CollectionPropsModel = V2Model.named("CollectionProps").props({
  id: typeV3Id(kCollectionIdPrefix),
  labels: types.maybe(CollectionLabels)
})
.actions(self => ({
  setSingleCase(singleCase: string) {
    if (self.labels) {
      self.labels.singleCase = singleCase
    } else {
      self.labels = CollectionLabels.create({ singleCase })
    }
  },
  setPluralCase(pluralCase: string) {
    if (self.labels) {
      self.labels.pluralCase = pluralCase
    } else {
      self.labels = CollectionLabels.create({ pluralCase })
    }
  },
  setSingleCaseWithArticle(singleCaseWithArticle: string) {
    if (self.labels) {
      self.labels.singleCaseWithArticle = singleCaseWithArticle
    } else {
      self.labels = CollectionLabels.create({ singleCaseWithArticle })
    }
  },
  setSetOfCases(setOfCases: string) {
    if (self.labels) {
      self.labels.setOfCases = setOfCases
    } else {
      self.labels = CollectionLabels.create({ setOfCases })
    }
  },
  setSetOfCasesWithArticle(setOfCasesWithArticle: string) {
    if (self.labels) {
      self.labels.setOfCasesWithArticle = setOfCasesWithArticle
    } else {
      self.labels = CollectionLabels.create({ setOfCasesWithArticle })
    }
  }
}))
.actions(self => ({
  setLabels(labels: Partial<ICollectionLabels>) {
    if (labels.singleCase) self.setSingleCase(labels.singleCase)
    if (labels.pluralCase) self.setPluralCase(labels.pluralCase)
    if (labels.singleCaseWithArticle) self.setSingleCaseWithArticle(labels.singleCaseWithArticle)
    if (labels.setOfCases) self.setSetOfCases(labels.setOfCases)
    if (labels.setOfCasesWithArticle) self.setSetOfCasesWithArticle(labels.setOfCasesWithArticle)
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
