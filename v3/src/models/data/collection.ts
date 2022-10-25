import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { Attribute } from "./attribute"
import { uniqueId } from "../../utilities/js-utils"

export const CollectionLabels = types.model("CollectionLabels", {
  singleCase: "",
  pluralCase: "",
  singleCaseWithArticle: "",
  setOfCases: "",
  setOfCasesWithArticle: ""
})

export const CollectionModel = types.model("Collection", {
  id: types.optional(types.identifier, () => uniqueId()),
  name: "",
  title: "",
  attributes: types.array(types.safeReference(Attribute)),
  labels: types.optional(CollectionLabels, () => CollectionLabels.create())
})
export interface ICollectionModel extends Instance<typeof CollectionModel> {}
export interface ICollectionModelSnapshot extends SnapshotIn<typeof CollectionModel> {}
