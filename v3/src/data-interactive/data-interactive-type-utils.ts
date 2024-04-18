import { appState } from "../models/app-state"
import { IAttribute, IAttributeSnapshot } from "../models/data/attribute"
import { ICollectionModel } from "../models/data/collection"
import { IDataSet } from "../models/data/data-set"
import { v2ModelSnapshotFromV2ModelStorage } from "../models/data/v2-model"
import { getSharedCaseMetadataFromDataset } from "../models/shared/shared-data-utils"
import { ICodapV2Attribute, v3TypeFromV2TypeString } from "../v2/codap-v2-types"
import { DIAttribute, DIResources, DISingleValues } from "./data-interactive-types"

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
    // _categoryMap, // TODO This is incomplete
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
  const attrs: Partial<ICodapV2Attribute>[] = []
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

export function convertUngroupedCollectionToV2(dataContext: IDataSet) {
  // TODO This will probably need to be reworked after upcoming v3 collection overhaul,
  // so I'm leaving it bare bones for now.
  const ungroupedAttributes = dataContext.ungroupedAttributes
  if (ungroupedAttributes.length > 0) {
    return {
      attrs: ungroupedAttributes.map(attr => convertAttributeToV2(attr, dataContext)),
      name: dataContext.name,
      title: dataContext.title,
      type: "DG.Collection"
    }
  }
}

export function convertDataSetToV2(dataSet: IDataSet) {
  const { name, title, id, description } = dataSet

  const collections: unknown[] =
    dataSet.collectionGroups.map(collectionGroup => convertCollectionToV2(collectionGroup.collection, dataSet))
  const ungroupedCollection = convertUngroupedCollectionToV2(dataSet)
  if (ungroupedCollection) collections.push(ungroupedCollection)

  return {
    type: "DG.DataContext",
    document: appState.document.key,
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
