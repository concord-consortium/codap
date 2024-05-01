import { IAttribute, IAttributeSnapshot } from "../models/data/attribute"
import { ICollectionModel } from "../models/data/collection"
import { IDataSet } from "../models/data/data-set"
import { ICase } from "../models/data/data-set-types"
import { v2ModelSnapshotFromV2ModelStorage } from "../models/data/v2-model"
import { getSharedCaseMetadataFromDataset } from "../models/shared/shared-data-utils"
import {
  ICodapV2AttributeV3, ICodapV2CollectionV3, ICodapV2DataContextV3, v3TypeFromV2TypeString
} from "../v2/codap-v2-types"
import { DIAttribute, DIResources, DISingleValues } from "./data-interactive-types"
import { getCaseValues } from "./data-interactive-utils"

export function convertValuesToAttributeSnapshot(_values: DISingleValues): IAttributeSnapshot | undefined {
  const values = _values as DIAttribute
  if (values.name) {
    return {
      ...v2ModelSnapshotFromV2ModelStorage(values),
      userType: v3TypeFromV2TypeString(values.type),
      // defaultMin: values.defaultMin, // TODO defaultMin not a part of IAttribute yet
      // defaultMax: values.defaultMax, // TODO defaultMax not a part of IAttribute yet
      description: values.description ?? undefined,
      // categoryMap: values._categoryMap, // TODO categoryMap not part of IAttribute. Should it be?
      // blockDisplayOfEmptyCategories: values.blockDisplayOfEmptyCategories, // TODO Not part of IAttribute yet
      editable: values.editable == null || !!values.editable,
      // hidden is part of metadata, not the attribute model
      // renameable: values.renameable, // TODO renameable not part of IAttribute yet
      // deleteable: values.deleteable, // TODO deleteable not part of IAttribute yet
      formula: values.formula ? { display: values.formula } : undefined,
      // deletedFormula: values.deletedFormula, // TODO deletedFormula not part of IAttribute. Should it be?
      precision: values.precision == null || values.precision === "" ? undefined : +values.precision,
      units: values.unit ?? undefined
    }
  }
}

export function convertCaseToV2FullCase(c: ICase, dataContext: IDataSet) {
  const caseId = c.__id__

  const context = {
    id: dataContext.id,
    name: dataContext.name
  }

  const caseGroup = dataContext.pseudoCaseMap.get(caseId)
  const collectionId = caseGroup?.collectionId ?? dataContext.ungrouped.id

  const parent = dataContext.getParentCase(caseId, collectionId)?.pseudoCase.__id__

  const _collection = dataContext.getCollection(collectionId)
  const collectionIndex = dataContext.getCollectionIndex(collectionId)
  const parentCollection = dataContext.collections[collectionIndex - 1]
  const parentCollectionInfo = parentCollection ? {
    id: parentCollection.id,
    name: parentCollection.name
  } : undefined
  const collection = _collection ? {
    id: _collection.id,
    name: _collection.name,
    parent: parentCollectionInfo
  } : undefined

  const values = getCaseValues(caseId, collectionId, dataContext)

  return {
    id: caseGroup?.pseudoCase.__id__,
    itemId: dataContext.getCase(caseId)?.__id__,
    parent,
    context,
    collection,
    values
  }
}

export function convertAttributeToV2(attribute: IAttribute, dataContext?: IDataSet): ICodapV2AttributeV3 {
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
    // _categoryMap, // TODO This is incomplete
    // blockDisplayOfEmptyCategories: self.blockDisplayOfEmptyCategories, // TODO What?
    editable,
    hidden: (attribute && metadata?.hidden.get(attribute.id)) ?? false,
    renameable: true, // TODO What should this be?
    deleteable: true, // TODO What should this be?
    formula: attribute.formula?.display,
    // deletedFormula: self.deletedFormula, // TODO What should this be?
    guid: id,
    id,
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

export function convertCollectionToV2(collection: ICollectionModel, dataContext?: IDataSet): ICodapV2CollectionV3 {
  const { name, title, id } = collection
  const v2Attrs = collection.attributes.map(attribute => {
    if (attribute) return convertAttributeToV2(attribute, dataContext)
  })
  const attrs: ICodapV2AttributeV3[] = []
  v2Attrs.forEach(attr => attr && attrs.push(attr))
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

export function convertUngroupedCollectionToV2(dataContext: IDataSet): ICodapV2CollectionV3 | undefined {
  // TODO This will probably need to be reworked after upcoming v3 collection overhaul,
  // so I'm leaving it bare bones for now.
  const { name, title, id } = dataContext.ungrouped
  const ungroupedAttributes = dataContext.ungroupedAttributes
  if (ungroupedAttributes.length > 0) {
    return {
      guid: id,
      id,
      name,
      title,
      attrs: ungroupedAttributes.map(attr => convertAttributeToV2(attr, dataContext)),
      type: "DG.Collection"
    }
  }
}

export function convertDataSetToV2(dataSet: IDataSet, docId: number | string): ICodapV2DataContextV3 {
  const { name, title, id, description } = dataSet

  const collections: ICodapV2CollectionV3[] =
    dataSet.collectionGroups.map(collectionGroup => convertCollectionToV2(collectionGroup.collection, dataSet))
  const ungroupedCollection = convertUngroupedCollectionToV2(dataSet)
  if (ungroupedCollection) collections.push(ungroupedCollection)

  return {
    type: "DG.DataContext",
    document: docId,
    guid: id,
    id,
    // flexibleGroupChangeFlag,
    name,
    title,
    collections,
    description,
    // metadata,
    // preventReorg,
    // setAsideItems,
    // contextStorage
  }
}

export function basicDataSetInfo(dataSet: IDataSet) {
  return {
    name: dataSet.name,
    id: dataSet.id,
    title: dataSet.title
  }
}
