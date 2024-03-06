import { types } from "mobx-state-tree"
import { Attribute } from "../../models/data/attribute"

export const V2Attribute = types.snapshotProcessor(Attribute, {
  postProcessor(snapshot, self) {
    return {
      name: self.name,
      type: self.type, // TODO This won't return "none", which v2 sometimes does
      title: self.title,
      // cid: self.cid, // TODO What should this be?
      // defaultMin: self.defaultMin, // TODO Where should this come from?
      // defaultMax: self.defaultMax, // TODO Where should this come from?
      description: self.description,
      // _categoryMap: self.categoryMap, // TODO What is this?
      // blockDisplayOfEmptyCategories: self.blockDisplayOfEmptyCategories, // TODO What?
      editable: self.editable,
      hidden: false, // TODO What should this be?
      renameable: true, // TODO What should this be?
      deleteable: true, // TODO What should this be?
      formula: self.formula?.display,
      // deletedFormula: self.deletedFormula, // TODO What should this be?
      guid: self.id, // TODO This is different than v2
      id: self.id, // TODO This is different than v2
      precision: self.precision,
      unit: self.units // TODO Is this correct?
    }
  }
})
