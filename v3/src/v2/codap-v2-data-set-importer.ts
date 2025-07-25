import { SetRequired } from "type-fest"
import { ICollectionModel, ICollectionModelSnapshot } from "../models/data/collection"
import { IDataSet, toCanonical } from "../models/data/data-set"
import { ICaseCreation, IItem } from "../models/data/data-set-types"
import { importV2CategorySet, V2CategorySetInput } from "../models/data/v2-category-set-importer"
import { v2NameTitleToV3Title } from "../models/data/v2-model"
import {
  DataSetMetadata, ICollectionLabelsSnapshot, IDataSetMetadata, isNonEmptyCollectionLabels
} from "../models/shared/data-set-metadata"
import { kSharedDataSetType, SharedDataSet } from "../models/shared/shared-data-set"
import { getMetadataFromDataSet } from "../models/shared/shared-data-utils"
import { ISharedModelManager } from "../models/shared/shared-model-manager"
import { kItemIdPrefix, toV3AttrId, toV3CaseId, toV3CollectionId, toV3DataSetId, v3Id } from "../utilities/codap-utils"
import {
  ICodapV2Attribute, ICodapV2Case, ICodapV2Collection, ICodapV2DataContext, ICodapV2DataContextStorage,
  ICodapV2GameContext, ICodapV2SetAsideItem, isV2SetAsideItem, v3TypeFromV2TypeString
} from "./codap-v2-data-context-types"

interface V2CaseIdInfo {
  // cumulative list of ordered attribute names used for grouping
  groupAttrNames: string[]
  // mapping from group key (parent attribute values) to case id
  groupKeyCaseIds: Map<string, string>
}

// This supports importing ICodapV2DataContext and ICodapV2GameContext
type ImportableContext = ICodapV2DataContext | ICodapV2GameContext

export class CodapV2DataSetImporter {
  private guidMap

  // index into the array is `level`
  private v2CaseIdInfoArray: V2CaseIdInfo[] = []

  constructor(guidMap: Map<number, { type: string, object: any }>) {
    this.guidMap = guidMap
  }

  getParentCase(aCase: ICodapV2Case) {
    const parentCaseId = aCase.parent
    return parentCaseId != null ? this.guidMap.get(parentCaseId)?.object as ICodapV2Case | undefined : undefined
  }

  importContext(context: ImportableContext, sharedModelManager?: ISharedModelManager) {
    const { collections = [], guid, name = "", title, contextStorage, setAsideItems } = context
    const dataSetId = toV3DataSetId(guid)

    // add shared models
    const sharedDataSet = SharedDataSet.create({ dataSet: { id: dataSetId, name, _title: title } })
    sharedModelManager?.addSharedModel(sharedDataSet)
    const metadata = DataSetMetadata.create()
    sharedModelManager?.addSharedModel(metadata)
    metadata.setData(sharedDataSet.dataSet)

    this.importMetadata(metadata, context)

    this.importCollections(sharedDataSet.dataSet, metadata, collections)
    this.importSetAsideItems(sharedDataSet.dataSet, setAsideItems)
    sharedDataSet.dataSet.syncCollectionLinks()
    sharedDataSet.dataSet.validateCases()

    this.importSelectedCases(sharedDataSet.dataSet, contextStorage)
  }

  importMetadata(metadata: IDataSetMetadata, context: ImportableContext) {
    const { description: legacyDescription, metadata: v2Metadata, flexibleGroupingChangeFlag, preventReorg } = context
    const { description, source, importDate, "import date": legacyImportDate} = v2Metadata ?? {}

    // Set the metadata for shared case metadata
    if (description || legacyDescription) {
      metadata.setDescription(description || legacyDescription)
    }
    if (source) {
      metadata.setSource(source)
    }
    if (importDate || legacyImportDate) {
      metadata.setImportDate(importDate || legacyImportDate)
    }
    if (flexibleGroupingChangeFlag != null) {
      metadata.setIsAttrConfigChanged(flexibleGroupingChangeFlag)
    }
    if (preventReorg != null) {
      metadata.setIsAttrConfigProtected(preventReorg)
    }
  }

  importCollections(data: IDataSet, metadata: IDataSetMetadata, collections: ICodapV2Collection[]) {
    let prevCollection: ICollectionModel | undefined
    collections.forEach((collection, index) => {
      const { attrs = [], cases = [], guid, name = "", title, caseName, defaults, labels: v2Labels } = collection
      const v3CollectionId = toV3CollectionId(guid)
      const _title = v2NameTitleToV3Title(name, title)
      const v3Labels: ICollectionLabelsSnapshot = { ...v2Labels }
      if (caseName && !v3Labels.singleCase) v3Labels.singleCase = caseName

      if (defaults) {
        metadata.setCollectionDefaults(v3CollectionId, defaults)
      }
      if (isNonEmptyCollectionLabels(v3Labels)) {
        metadata.setCollectionLabels(v3CollectionId, v3Labels)
      }

      // assumes hierarchical collections are in order parent => child
      const level = collections.length - index - 1  // 0 === child-most
      this.v2CaseIdInfoArray[level] = { groupAttrNames: [], groupKeyCaseIds: new Map() }
      this.importAttributes(data, metadata, attrs, level)
      this.importCases(data, cases, level)
      this.importCategories(data, metadata, attrs)

      const attributes = attrs.map(attr => {
        const attrModel = data.attrFromName(attr.name)
        return attrModel?.id
      }).filter(attrId => !!attrId) as string[]

      const collectionSnap: SetRequired<ICollectionModelSnapshot, "attributes"> = {
        id: toV3CollectionId(guid),
        name,
        _title,
        attributes,
        _groupKeyCaseIds: Array.from(this.v2CaseIdInfoArray[level].groupKeyCaseIds.entries())
      }
      // remove default collection
      if (index === 0) {
        data.removeCollection(data.collections[0])
      }
      // add the imported collections
      prevCollection = data.addCollection(collectionSnap, { after: prevCollection?.id })
    })
  }

  importAttributes(data: IDataSet, metadata: IDataSetMetadata, attributes: ICodapV2Attribute[], level: number) {
    const v2CaseIdInfo = this.v2CaseIdInfoArray[level]
    const v2ParentCaseIdInfo = this.v2CaseIdInfoArray[level + 1]
    if (v2ParentCaseIdInfo) {
      // grouping attribute are cumulative, i.e. include all parent attributes
      v2CaseIdInfo.groupAttrNames = [...v2ParentCaseIdInfo.groupAttrNames]
    }
    attributes.forEach(v2Attr => {
      const {
        cid: _cid, guid, description: v2Description, name = "", title: v2Title, type: v2Type, formula: v2Formula,
        editable: v2Editable, unit: v2Unit, precision: v2Precision, decimals, defaultMin, defaultMax,
        renameable, deleteable, deletedFormula
      } = v2Attr
      if (!v2Formula) {
        v2CaseIdInfo.groupAttrNames.push(name)
      }
      const _title = v2NameTitleToV3Title(name, v2Title)
      const description = v2Description ?? undefined
      const userType = v3TypeFromV2TypeString(v2Type)
      const formula = v2Formula ? { display: v2Formula } : undefined
      const editable = v2Editable == null || !!v2Editable
      const precision = v2Precision != null && v2Precision !== ""
                          ? +v2Precision
                          : decimals != null && decimals !== ""
                            ? +decimals
                            : undefined
      const units = v2Unit ?? undefined
      const attribute = data.addAttribute({
        id: toV3AttrId(guid), _cid, name, description, formula, _title, userType, units, precision
      })
      if (attribute) {
        if (v2Attr.hidden) {
          metadata.setIsHidden(attribute.id, true)
        }
        if (!editable) {
          metadata.setIsEditProtected(attribute.id, true)
        }
        if (renameable != null && !renameable) {
          metadata.setIsRenameProtected(attribute.id, false)
        }
        if (deleteable != null && !deleteable) {
          metadata.setIsDeleteProtected(attribute.id, false)
        }
        if (defaultMin != null || defaultMax != null) {
          metadata.setAttributeDefaultRange(attribute.id, defaultMin, defaultMax)
        }
        if (deletedFormula) {
          metadata.setDeletedFormula(deletedFormula)
        }
      }
    })
  }

  importCategories(data: IDataSet, metadata: IDataSetMetadata, attributes: ICodapV2Attribute[]) {
    attributes.forEach(v2Attr => {
      const {
        guid, colormap, _categoryMap
      } = v2Attr
      const attribute = data.getAttribute(toV3AttrId(guid))
      if (attribute) {
        const categorySetInput: Maybe<V2CategorySetInput> = _categoryMap || colormap
        if (categorySetInput) {
          // create CategorySet if necessary
          const categorySetSnap = importV2CategorySet(attribute, categorySetInput)
          if (categorySetSnap) {
            metadata.setCategorySet(attribute.id, categorySetSnap)
          }
        }
      }
    })
  }

  importCases(data: IDataSet, cases: ICodapV2Case[], level: number) {
    const itemsToAdd: ICaseCreation[] = []
    const v2CollectionInfo = this.v2CaseIdInfoArray[level]
    const groupKeyCaseIds = v2CollectionInfo.groupKeyCaseIds
    cases.forEach(_case => {
      // some v2 documents don't store item ids, so we generate them if necessary
      const { guid, itemID = v3Id(kItemIdPrefix), values } = _case
      const v3CaseId = toV3CaseId(guid)
      // for level 0 (child-most collection), add items with their item ids and stash case ids
      if (level === 0) {
        let itemValues = { __id__: itemID, ...toCanonical(data, values) }
        // look up parent case attributes and add them to caseValues
        for (let parentCase = this.getParentCase(_case); parentCase; parentCase = this.getParentCase(parentCase)) {
          itemValues = {
            ...(parentCase.values ? toCanonical(data, parentCase.values) : undefined),
            ...itemValues
          }
        }
        itemsToAdd.push(itemValues)
        if (itemID) {
          groupKeyCaseIds.set(itemID, v3CaseId)
        }
      }
      // for parent collections, stash case ids in `groupKeyCaseIds`
      else {
        const caseValues = { ...values }
        for (let parentCase = this.getParentCase(_case); parentCase; parentCase = this.getParentCase(parentCase)) {
          Object.assign(caseValues, parentCase.values)
        }
        const groupValues = v2CollectionInfo.groupAttrNames.map(name => {
          return caseValues[name] != null ? String(caseValues[name]) : ""
        })
        const groupKey = JSON.stringify(groupValues)
        v2CollectionInfo.groupKeyCaseIds.set(groupKey, v3CaseId)
      }
    })
    if (itemsToAdd.length) {
      data.addCases(itemsToAdd)
    }
  }

  importSetAsideItems(data: IDataSet, setAsideItems?: ICodapV2SetAsideItem[]) {
    const itemsToAdd: IItem[] = []
    setAsideItems?.forEach(item => {
      if (isV2SetAsideItem(item)) {
        const { id, values } = item
        itemsToAdd.push({ __id__: id, ...toCanonical(data, values) })
      }
    })
    if (itemsToAdd.length) {
      data.addCases(itemsToAdd)
      data.hideCasesOrItems(itemsToAdd.map(item => item.__id__))
    }
  }

  importSelectedCases(data: IDataSet, contextStorage?: ICodapV2DataContextStorage) {
    const { _links_: { selectedCases = [] } = {} } = contextStorage || {}
    const selectedCaseIds: string[] = []
    selectedCases.forEach(selectedCase => {
      const { id: v2CaseId } = selectedCase
      const v3CaseId = toV3CaseId(v2CaseId)
      if (data.caseInfoMap.get(v3CaseId)) {
        selectedCaseIds.push(v3CaseId)
      }
    })
    if (selectedCaseIds.length) {
      data.setSelectedCases(selectedCaseIds)
    }
  }
}

export function getCaseDataFromV2ContextGuid(dataContextGuid?: number, sharedModelManager?: ISharedModelManager) {
  // This function will return the shared data set and case metadata for a given data context
  const dataSetId = dataContextGuid ? toV3DataSetId(dataContextGuid) : undefined
  const sharedDataSets = sharedModelManager?.getSharedModelsByType<typeof SharedDataSet>(kSharedDataSetType)
  const sharedData = sharedDataSets?.find(shared => shared.dataSet.id === dataSetId)
  const sharedMetadata = getMetadataFromDataSet(sharedData?.dataSet)
  return { sharedData, sharedMetadata }
}
