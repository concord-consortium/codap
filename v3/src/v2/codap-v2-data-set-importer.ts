import { SetRequired } from "type-fest"
import { ICollectionModel, ICollectionModelSnapshot } from "../models/data/collection"
import { IDataSet, toCanonical } from "../models/data/data-set"
import { ICaseCreation, IItem } from "../models/data/data-set-types"
import { importV2CategorySet, V2CategorySetInput } from "../models/data/v2-category-set-importer"
import { v2NameTitleToV3Title } from "../models/data/v2-model"
import { ISharedCaseMetadata, kSharedCaseMetadataType, SharedCaseMetadata } from "../models/shared/shared-case-metadata"
import { kSharedDataSetType, SharedDataSet } from "../models/shared/shared-data-set"
import { ISharedModelManager } from "../models/shared/shared-model-manager"
import { kItemIdPrefix, toV3AttrId, toV3CaseId, toV3CollectionId, toV3DataSetId, v3Id } from "../utilities/codap-utils"
import {
  ICodapV2Attribute, ICodapV2Case, ICodapV2Collection, ICodapV2DataContext, ICodapV2GameContext, ICodapV2SetAsideItem,
  isV2SetAsideItem, v3TypeFromV2TypeString
} from "./codap-v2-data-set-types"

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
    const { collections = [], guid, name = "", title } = context
    const dataSetId = toV3DataSetId(guid)

    // add shared models
    const sharedDataSet = SharedDataSet.create({ dataSet: { id: dataSetId, name, _title: title } })
    sharedModelManager?.addSharedModel(sharedDataSet)
    const caseMetadata = SharedCaseMetadata.create()
    sharedModelManager?.addSharedModel(caseMetadata)
    caseMetadata.setData(sharedDataSet.dataSet)

    this.registerCollections(sharedDataSet.dataSet, caseMetadata, collections)
    this.registerSetAsideItems(sharedDataSet.dataSet, context.setAsideItems)
    sharedDataSet.dataSet.syncCollectionLinks()
    sharedDataSet.dataSet.validateCases()
  }

  registerCollections(data: IDataSet, caseMetadata: ISharedCaseMetadata, collections: ICodapV2Collection[]) {
    let prevCollection: ICollectionModel | undefined
    collections.forEach((collection, index) => {
      const { attrs = [], cases = [], guid, name = "", title } = collection
      const _title = v2NameTitleToV3Title(name, title)

      // assumes hierarchical collections are in order parent => child
      const level = collections.length - index - 1  // 0 === child-most
      this.v2CaseIdInfoArray[level] = { groupAttrNames: [], groupKeyCaseIds: new Map() }
      this.registerAttributes(data, caseMetadata, attrs, level)
      this.registerCases(data, cases, level)
      this.registerCategories(data, caseMetadata, attrs)

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

  registerAttributes(data: IDataSet, caseMetadata: ISharedCaseMetadata,
                      attributes: ICodapV2Attribute[], level: number) {
    const v2CaseIdInfo = this.v2CaseIdInfoArray[level]
    const v2ParentCaseIdInfo = this.v2CaseIdInfoArray[level + 1]
    if (v2ParentCaseIdInfo) {
      // grouping attribute are cumulative, i.e. include all parent attributes
      v2CaseIdInfo.groupAttrNames = [...v2ParentCaseIdInfo.groupAttrNames]
    }
    attributes.forEach(v2Attr => {
      const {
        cid: _cid, guid, description: v2Description, name = "", title: v2Title, type: v2Type, formula: v2Formula,
        editable: v2Editable, unit: v2Unit, precision: v2Precision, decimals
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
        id: toV3AttrId(guid), _cid, name, description, formula, _title, userType, editable, units, precision
      })
      if (attribute) {
        if (v2Attr.hidden) {
          caseMetadata.setIsHidden(attribute.id, true)
        }
      }
    })
  }

  registerCategories(data: IDataSet, caseMetadata: ISharedCaseMetadata, attributes: ICodapV2Attribute[]) {
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
            caseMetadata.setCategorySet(attribute.id, categorySetSnap)
          }
        }
      }
    })
  }

  registerCases(data: IDataSet, cases: ICodapV2Case[], level: number) {
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

  registerSetAsideItems(data: IDataSet, setAsideItems?: ICodapV2SetAsideItem[] | ICodapV2SetAsideItem["values"][]) {
    const itemsToAdd: IItem[] = []
    setAsideItems?.forEach(item => {
      if (isV2SetAsideItem(item)) {
        const { id, values } = item
        itemsToAdd.push({ __id__: id, ...toCanonical(data, values) })
      } else {
        itemsToAdd.push({ __id__: v3Id(kItemIdPrefix), ...toCanonical(data, item) })
      }
    })
    if (itemsToAdd.length) {
      data.addCases(itemsToAdd)
      data.hideCasesOrItems(itemsToAdd.map(item => item.__id__))
    }
  }
}

export function getCaseDataFromV2ContextGuid(dataContextGuid?: number, sharedModelManager?: ISharedModelManager) {
  // This function will return the shared data set and case metadata for a given data context
  const dataSetId = dataContextGuid ? toV3DataSetId(dataContextGuid) : undefined
  const sharedDataSets = sharedModelManager?.getSharedModelsByType<typeof SharedDataSet>(kSharedDataSetType)
  const data = sharedDataSets?.find(shared => shared.dataSet.id === dataSetId)
  const caseMetadata = sharedModelManager?.getSharedModelsByType<typeof SharedCaseMetadata>(kSharedCaseMetadataType)
  const metadata = caseMetadata?.find(shared => shared.data?.id === dataSetId)
  return { data, metadata }
}
