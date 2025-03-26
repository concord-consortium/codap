import { getSnapshot } from "mobx-state-tree"
import { IAttribute, IAttributeSnapshot } from "../models/data/attribute"
import { ICollectionModel } from "../models/data/collection"
import { IDataSet } from "../models/data/data-set"
import { ICase } from "../models/data/data-set-types"
import { v2ModelSnapshotFromV2ModelStorage } from "../models/data/v2-model"
import { IGlobalValue } from "../models/global/global-value"
import { getSharedCaseMetadataFromDataset } from "../models/shared/shared-data-utils"
import { kAttrIdPrefix, maybeToV2Id, toV2Id, toV3AttrId } from "../utilities/codap-utils"
import { ICodapV2DataContextV3 } from "../v2/codap-v2-types"
import {
  CodapV2ColorMap, ICodapV2Attribute, ICodapV2Case, ICodapV2CollectionV3, v3TypeFromV2TypeString
} from "../v2/codap-v2-data-set-types"
import { DIGetCaseResult, DIAttribute } from "./data-interactive-data-set-types"
import { DIResources, DISingleValues } from "./data-interactive-types"
import { getCaseValues } from "./data-interactive-utils"

export function convertValuesToAttributeSnapshot(_values: DISingleValues): IAttributeSnapshot | undefined {
  const values = _values as DIAttribute
  if (values.name) {
    const id = values.id != null ? toV3AttrId(values.id) : values.cid
    return {
      ...v2ModelSnapshotFromV2ModelStorage(kAttrIdPrefix, values),
      id,
      userType: v3TypeFromV2TypeString(values.type),
      // defaultMin: values.defaultMin, // TODO defaultMin not a part of IAttribute yet
      // defaultMax: values.defaultMax, // TODO defaultMax not a part of IAttribute yet
      description: values.description ?? undefined,
      // categoryMap: values._categoryMap, // TODO categoryMap not part of IAttribute. Should it be?
      // blockDisplayOfEmptyCategories: values.blockDisplayOfEmptyCategories, // TODO Not part of IAttribute yet
      editable: values.editable == null || !!values.editable,
      // hidden is part of metadata, not the attribute model
      // renameable: values.renameable, // TODO renameable not part of IAttribute yet
      deleteable: values.deleteable,
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
    id: toV2Id(dataContext.id),
    name: dataContext.name
  }

  const _collection = dataContext.getCollectionForCase(caseId)
  const collectionId = _collection?.id
  const caseGroup = dataContext.caseInfoMap.get(caseId)

  const parent = maybeToV2Id(dataContext.getParentCase(caseId, collectionId)?.groupedCase.__id__)

  const collectionIndex = collectionId ? dataContext.getCollectionIndex(collectionId) : -1
  const parentCollection = collectionIndex > 0 ? dataContext.collections[collectionIndex - 1] : undefined
  const parentCollectionInfo = parentCollection ? {
    id: toV2Id(parentCollection.id),
    name: parentCollection.name
  } : undefined
  const collection = _collection ? {
    id: toV2Id(_collection.id),
    name: _collection.name,
    parent: parentCollectionInfo
  } : undefined

  const values = collectionId ? getCaseValues(caseId, dataContext, collectionId) : undefined

  return {
    id: maybeToV2Id(caseGroup?.groupedCase.__id__),
    itemId: maybeToV2Id(dataContext.getItem(caseId)?.__id__),
    parent,
    context,
    collection,
    values
  }
}

export function getCaseRequestResultValues(c: ICase, dataContext: IDataSet): DIGetCaseResult {
  const caseId = c.__id__

  const id = toV2Id(caseId)

  const caseGroup = dataContext.caseInfoMap.get(caseId)
  const collectionId = caseGroup?.collectionId ?? dataContext.childCollection.id

  const parent = maybeToV2Id(dataContext.getParentCase(caseId, collectionId)?.groupedCase.__id__)

  const _collection = dataContext.getCollection(collectionId)
  const collection = _collection ? {
    id: toV2Id(_collection.id),
    name: _collection.name
  } : undefined

  const values = getCaseValues(caseId, dataContext, collectionId)

  const children = caseGroup?.childCaseIds?.map(cId => toV2Id(cId)) ?? []

  const caseIndex = dataContext.getCasesForCollection(collectionId).findIndex(aCase => aCase.__id__ === caseId)

  return {
    case: { id, parent, collection, values, children },
    caseIndex
  }
}

export function convertAttributeToV2(attribute: IAttribute, dataContext?: IDataSet): ICodapV2Attribute {
  const metadata = dataContext && getSharedCaseMetadataFromDataset(dataContext)
  const { cid, name, type, title, description, deleteable, editable, id, precision } = attribute
  const v2Id = toV2Id(id)
  const rawColorMap = metadata?.getCategorySet(attribute.id)?.colorMap ?? {}
  const entries = Object.entries(rawColorMap).filter((entry): entry is [string, string] => entry[1] !== undefined)
  const colormap: CodapV2ColorMap = Object.fromEntries(entries)

  return {
    name,
    type,
    title,
    cid,
    colormap,
    // defaultMin: self.defaultMin, // TODO Where should this come from?
    // defaultMax: self.defaultMax, // TODO Where should this come from?
    description,
    // _categoryMap, // TODO This is incomplete
    // blockDisplayOfEmptyCategories: self.blockDisplayOfEmptyCategories, // TODO What?
    editable,
    hidden: (attribute && metadata?.hidden.get(attribute.id)) ?? false,
    renameable: true, // TODO What should this be?
    deleteable,
    formula: attribute.formula?.display,
    // deletedFormula: self.deletedFormula, // TODO What should this be?
    guid: v2Id,
    id: v2Id,
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

interface CCV2Options {
  dataSet?: IDataSet
  exportCases?: boolean
}
export function convertCollectionToV2(collection: ICollectionModel, options?: CCV2Options): ICodapV2CollectionV3 {
  const { name, title, id, labels: _labels } = collection
  const { dataSet, exportCases } = options || {}
  const v2Id = toV2Id(id)
  const labels = _labels ? getSnapshot(_labels) : undefined
  const attrs = collection.attributes.map(attribute => {
    if (attribute) return convertAttributeToV2(attribute, dataSet)
  }).filter(attr => !!attr)

  let cases: Maybe<{ cases: ICodapV2Case[] }>
  if (exportCases) {
    cases = {
      cases: collection.cases.map(aCase => {
        const v2CaseId = toV2Id(aCase.__id__)
        const parentCase = dataSet?.getParentCase(aCase.__id__, collection.id)
        const v2ParentCaseId = parentCase ? toV2Id(parentCase.groupedCase.__id__) : undefined
        const values: ICodapV2Case["values"] = {}
        collection.dataAttributesArray.forEach(attr => {
          values[attr.name] = dataSet?.getValue(aCase.__id__, attr.id) ?? ""
        })
        return { guid: v2CaseId, id: v2CaseId, parent: v2ParentCaseId, values }
      })
    }
  }
  return {
    // areParentChildLinksConfigured,
    attrs,
    ...cases,
    // caseName,
    // childAttrName,
    // collapseChildren,
    guid: v2Id,
    id: v2Id,
    labels,
    name,
    parent: collection.parent?.id ? toV2Id(collection.parent.id) : undefined,
    title,
    type: "DG.Collection"
  }
}

export function convertDataSetToV2(dataSet: IDataSet, exportCases = false): ICodapV2DataContextV3 {
  const { name, title, id, description } = dataSet
  const v2Id = toV2Id(id)
  dataSet.validateCases()

  const collections: ICodapV2CollectionV3[] =
    dataSet.collections.map(collection => convertCollectionToV2(collection, { dataSet, exportCases }))

  return {
    type: "DG.DataContext",
    document: 1,
    guid: v2Id,
    id: v2Id,
    // flexibleGroupChangeFlag,
    name,
    title,
    collections,
    description,
    // metadata,
    // preventReorg,
    // TODO_V2_EXPORT setAsideItems
    setAsideItems: [],
    // TODO_V2_EXPORT contextStorage
    // providing an empty object makes it possible for CODAPv2 to load more exported documents
    contextStorage: {}
  }
}

export function getV2ItemResult(dataContext: IDataSet, itemId: string) {
  return {
    id: toV2Id(itemId),
    values: getCaseValues(itemId, dataContext)
  }
}

export function basicDataSetInfo(dataSet: IDataSet) {
  return {
    name: dataSet.name,
    id: toV2Id(dataSet.id),
    title: dataSet.title
  }
}

export function basicAttributeInfo(attribute: IAttribute) {
  const { name, id, title } = attribute
  return { name, id: toV2Id(id), title }
}

export function basicCollectionInfo(collection: ICollectionModel) {
  const { name, id, title } = collection
  const v2Id = toV2Id(id)
  return { name, guid: v2Id, title, id: v2Id }
}

export function valuesFromGlobal(global: IGlobalValue) {
  return {
    name: global.name,
    value: global.value,
    id: toV2Id(global.id)
  }
}
