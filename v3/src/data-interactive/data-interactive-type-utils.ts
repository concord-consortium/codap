import { getSnapshot } from "mobx-state-tree"
import { IAttribute, IAttributeSnapshot } from "../models/data/attribute"
import { ICollectionModel } from "../models/data/collection"
import { IDataSet } from "../models/data/data-set"
import { ICase, IGetCaseOptions } from "../models/data/data-set-types"
import { v2ModelSnapshotFromV2ModelStorage } from "../models/data/v2-model"
import { IGlobalValue } from "../models/global/global-value"
import { getMetadataFromDataSet } from "../models/shared/shared-data-utils"
import { kAttrIdPrefix, maybeToV2Id, toV2Id, toV2ItemId, toV3AttrId } from "../utilities/codap-utils"
import { IV2CollectionDefaults } from "../models/shared/data-set-metadata"
import { ICodapV2DataContextV3 } from "../v2/codap-v2-types"
import {
  ICodapV2Attribute, ICodapV2Case, ICodapV2CategoryMap, ICodapV2CollectionV3, ICodapV2DataContextSelectedCase,
  v3TypeFromV2TypeString
} from "../v2/codap-v2-data-context-types"
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
      description: values.description ?? undefined,
      formula: values.formula ? { display: values.formula } : undefined,
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
  const metadata = dataContext && getMetadataFromDataSet(dataContext)
  const { cid, name, type, title, description, id, precision } = attribute
  const v2Id = toV2Id(id)
  const _defaultRange = metadata?.getAttributeDefaultRange(attribute.id)
  const defaultRange = _defaultRange ? { defaultMin: _defaultRange[0], defaultMax: _defaultRange[1] } : undefined
  const categorySet = metadata?.getCategorySet(attribute.id, false)
  const colorMap = categorySet?.colorMap ?? {}
  const _categoryMap = {
    ...colorMap,
    __order: categorySet?.valuesArray ?? []
  } as ICodapV2CategoryMap
  const categoryMap = categorySet ? { _categoryMap } : undefined

  return {
    name,
    type,
    title,
    cid,
    description,
    ...defaultRange,
    ...categoryMap,
    editable: (attribute && !metadata?.isEditProtected(attribute.id)) ?? true,
    hidden: (attribute && metadata?.isHidden(attribute.id)) ?? false,
    renameable: (attribute && !metadata?.isRenameProtected(attribute.id)) ?? true,
    deleteable: (attribute && !metadata?.isDeleteProtected(attribute.id)) ?? true,
    formula: attribute.formula?.display,
    deletedFormula: (attribute && metadata?.getAttributeDeletedFormula(attribute.id)) || undefined,
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
  defaults?: IV2CollectionDefaults
}
export function convertCollectionToV2(collection: ICollectionModel, options?: CCV2Options): ICodapV2CollectionV3 {
  const { name, title, id } = collection
  const { dataSet, exportCases, defaults } = options || {}
  const metadata = getMetadataFromDataSet(dataSet)
  const _labels = metadata?.collections.get(collection.id)?.labels
  const labels = _labels?.isNonEmpty ? { labels: getSnapshot(_labels) } : undefined
  const v2Id = toV2Id(id)
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
    attrs,
    ...cases,
    // childAttrName,
    guid: v2Id,
    id: v2Id,
    ...labels,
    name,
    parent: collection.parent?.id ? toV2Id(collection.parent.id) : undefined,
    title,
    defaults,
    type: "DG.Collection"
  }
}

export function convertDataSetToV2(dataSet: IDataSet, exportCases = false): ICodapV2DataContextV3 {
  const { name, _title, id } = dataSet
  const v3Metadata = getMetadataFromDataSet(dataSet)
  const { description, source, importDate, isAttrConfigChanged, isAttrConfigProtected } = v3Metadata || {}
  const v2Id = toV2Id(id)
  const itemOptions: IGetCaseOptions = { canonical: false, numeric: true }
  let foundDefaultsInCollection = false
  dataSet.validateCases()

  const selectedCases: ICodapV2DataContextSelectedCase[] = []
  const collections: ICodapV2CollectionV3[] =
    dataSet.collections.map(collection => {
      const defaults = v3Metadata?.collections.get(collection.id)?.defaults
      foundDefaultsInCollection ||= defaults?.isNonEmpty || false
      collection.caseIds.forEach(caseId => {
        if (dataSet.isCaseSelected(caseId)) {
          selectedCases.push({ type: "DG.Case", id: toV2Id(caseId) })
        }
      })
      return convertCollectionToV2(collection, { dataSet, exportCases, defaults })
    })
  const v2Metadata = v3Metadata?.hasDataContextMetadata
                    ? { metadata: { description, source, importDate} }
                    : undefined

  return {
    type: foundDefaultsInCollection ? "DG.GameContext" : "DG.DataContext",
    document: 1,
    guid: v2Id,
    id: v2Id,
    name,
    title: _title,
    collections,
    ...v2Metadata,
    flexibleGroupingChangeFlag: isAttrConfigChanged,
    preventReorg: isAttrConfigProtected,
    setAsideItems: dataSet._itemIds
                    .filter(itemId => dataSet.isItemSetAside(itemId))
                    .map(itemId => ({ id: toV2ItemId(itemId), values: dataSet.getItem(itemId, itemOptions) ?? {} })),
    contextStorage: { _links_: { selectedCases } }
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
    title: dataSet._title
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
