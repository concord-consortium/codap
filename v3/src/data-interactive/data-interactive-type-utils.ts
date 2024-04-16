import { IAttribute } from "../models/data/attribute"
import { ICollectionModel } from "../models/data/collection"
import { IDataSet } from "../models/data/data-set"
import { getSharedCaseMetadataFromDataset } from "../models/shared/shared-data-utils"
import { DIAttribute, DIResources } from "./data-interactive-types"

export function convertAttributeToV2(attribute: IAttribute, dataContext?: IDataSet): DIAttribute {
  const metadata = dataContext && getSharedCaseMetadataFromDataset(dataContext)
  const { name, type, title, description, editable, id, precision } = attribute
  return {
    name,
    type,
    title,
    cid: id,
    // defaultMin: self.defaultMin, // TODO Where should this come from?
    // defaultMax: self.defaultMax, // TODO Where should this come from?
    description,
    _categoryMap: { __order: attribute.strValues }, // TODO This is incomplete
    // blockDisplayOfEmptyCategories: self.blockDisplayOfEmptyCategories, // TODO What?
    editable,
    hidden: (attribute && metadata?.hidden.get(attribute.id)) ?? false,
    renameable: true, // TODO What should this be?
    deleteable: true, // TODO What should this be?
    formula: attribute.formula?.display,
    // deletedFormula: self.deletedFormula, // TODO What should this be?
    guid: Number(id), // TODO This is different than v2
    id: Number(id), // TODO This is different than v2
    precision,
    unit: attribute.units
  }
}

export function convertAttributeToV2FromResources(resources: DIResources) {
  const { attribute, dataContext } = resources
  if (attribute) {
    return convertAttributeToV2(attribute, dataContext)
  }
}

export function convertCollectionToV2(collection: ICollectionModel, dataContext?: IDataSet) {
  const { name, title, id } = collection
  const v2Attrs = collection.attributes.map(attribute => {
    if (attribute) return convertAttributeToV2(attribute, dataContext)
  })
  const attrs = v2Attrs.filter(attr => !!attr)
  return {
    // areParentChildLinksConfigured,
    attrs,
    // cases,
    // caseName,
    // childAttrName,
    // collapseChildren,
    guid: id,
    id,
    name,
    // parent,
    title,
    type: "DG.Collection"
  }
}

export function convertUngroupedCollectionToV2(dataContext: IDataSet) {
  // TODO This will probably need to be reworked after upcoming v3 collection overhaul,
  // so I'm leaving it bare bones for now.
  return {
    attrs: dataContext.ungroupedAttributes.map(attr => convertAttributeToV2(attr, dataContext)),
    name: dataContext.name,
    title: dataContext.title,
    type: "DG.Collection"
  }
}

export function convertDataSetToV2(dataSet: IDataSet) {
  const { name, title, id, description } = dataSet
  return {
    type: "DG.DataContext",
    // document,
    guid: id,
    id,
    // flexibleGroupChangeFlag,
    name,
    title,
    collections: [
      ...dataSet.collectionGroups.map(collectionGroup => convertCollectionToV2(collectionGroup.collection, dataSet)),
      convertUngroupedCollectionToV2(dataSet)
    ],
    description,
    // metadata,
    // preventReorg,
    // setAsideItems,
    // contextStorage
  }
}
