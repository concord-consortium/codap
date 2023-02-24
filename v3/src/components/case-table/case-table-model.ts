import { Instance, types } from "mobx-state-tree"
import { IDataSet } from "../../models/data/data-set"
import { ITileContentModel, TileContentModel } from "../../models/tiles/tile-content"
import { kCaseTableTileType } from "./case-table-defs"

export const CollectionTableModel = types.model("CollectionTable", {
  // key is valueJson; value is true (false values are deleted)
  collapsed: types.map(types.boolean)
})

export const CaseTableModel = TileContentModel
  .named("CaseTableModel")
  .props({
    type: types.optional(types.literal(kCaseTableTileType), kCaseTableTileType),
    // key is collection id
    collections: types.map(CollectionTableModel),
    // key is attribute id; value is width
    columnWidths: types.map(types.number),
    // key is attribute id; value is true (false values are deleted)
    hidden: types.map(types.boolean)
  })
  .volatile(self => ({
    data: undefined as IDataSet | undefined
  }))
  .views(self => ({
    columnWidth(attrId: string) {
      return self.columnWidths.get(attrId)
    },
    // true if passed the id of a parent/pseudo-case whose child cases have been collapsed, false otherwise
    isCollapsed(caseId: string) {
      const { collectionId, valuesJson } = self.data?.pseudoCaseMap[caseId] || {}
      return (collectionId && valuesJson && self.collections.get(collectionId)?.collapsed.get(valuesJson)) ?? false
    },
    // true if passed the id of a hidden attribute, false otherwise
    isHidden(attrId: string) {
      return self.hidden.get(attrId) ?? false
    }
  }))
  .actions(self => ({
    setData(data: IDataSet) {
      self.data = data
    },
    setColumnWidth(attrId: string, width?: number) {
      if (width) {
        self.columnWidths.set(attrId, width)
      }
      else {
        self.columnWidths.delete(attrId)
      }
    },
    setIsCollapsed(caseId: string, isCollapsed: boolean) {
      const { collectionId, valuesJson } = self.data?.pseudoCaseMap[caseId] || {}
      if (collectionId && valuesJson) {
        let tableCollection = self.collections.get(collectionId)
        if (isCollapsed) {
          if (!tableCollection) {
            tableCollection = CollectionTableModel.create()
            self.collections.set(collectionId, tableCollection)
          }
          tableCollection.collapsed.set(valuesJson, true)
        }
        else if (tableCollection) {
          tableCollection.collapsed.delete(valuesJson)
        }
      }
    },
    setIsHidden(attrId: string, hidden: boolean) {
      if (hidden) {
        self.hidden.set(attrId, true)
      }
      else {
        self.hidden.delete(attrId)
      }
    },
    showAllAttributes() {
      self.hidden.clear()
    }
  }))
export interface ICaseTableModel extends Instance<typeof CaseTableModel> {}

export function isCaseTableModel(model?: ITileContentModel): model is ICaseTableModel {
  return model?.type === kCaseTableTileType
}
