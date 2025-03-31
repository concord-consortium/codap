import { SetRequired } from "type-fest"
import { IAttribute } from "../models/data/attribute"
import { ICollectionModel, ICollectionModelSnapshot } from "../models/data/collection"
import { IDataSet, toCanonical } from "../models/data/data-set"
import { ICaseCreation, IItem } from "../models/data/data-set-types"
import { importV2CategorySet, V2CategorySetInput } from "../models/data/v2-category-set-importer"
import { v2NameTitleToV3Title } from "../models/data/v2-model"
import { ISharedCaseMetadata } from "../models/shared/shared-case-metadata"
import { kItemIdPrefix, toV3AttrId, toV3CaseId, toV3CollectionId, v3Id } from "../utilities/codap-utils"
import {
  ICodapV2Attribute, ICodapV2Case, ICodapV2Collection, ICodapV2DataContext, ICodapV2SetAsideItem,
  isV2SetAsideItem, v3TypeFromV2TypeString
} from "./codap-v2-data-set-types"

interface V2CaseIdInfo {
  // cumulative list of ordered attribute names used for grouping
  groupAttrNames: string[]
  // mapping from group key (parent attribute values) to case id
  groupKeyCaseIds: Map<string, string>
}

// This supports importing ICodapV2DataContext and ICodapV2GameContext
type ImportableContext = Pick<ICodapV2DataContext, "collections" | "setAsideItems">

export class CodapV2DataSetImporter {
  private guidMap
  private v3AttrMap

  // index into the array is `level`
  private v2CaseIdInfoArray: V2CaseIdInfo[] = []

  constructor(
    guidMap: Map<number, { type: string, object: any }>,
    v3AttrMap: Map<number, IAttribute>
  ) {
    this.guidMap = guidMap
    this.v3AttrMap = v3AttrMap
  }

  getParentCase(aCase: ICodapV2Case) {
    const parentCaseId = aCase.parent
    return parentCaseId != null ? this.guidMap.get(parentCaseId)?.object as ICodapV2Case | undefined : undefined
  }

  importContext(context: ImportableContext, dataSet: IDataSet, caseMetadata: ISharedCaseMetadata) {
    const { collections = [] } = context

    this.registerCollections(dataSet, caseMetadata, collections)
    this.registerSetAsideItems(dataSet, context.setAsideItems)
  }

  registerCollections(data: IDataSet, caseMetadata: ISharedCaseMetadata, collections: ICodapV2Collection[]) {
    let prevCollection: ICollectionModel | undefined
    collections.forEach((collection, index) => {
      const { attrs = [], cases = [], guid, name = "", title, type = "DG.Collection" } = collection
      const _title = v2NameTitleToV3Title(name, title)
      this.guidMap.set(guid, { type, object: collection })

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
      this.guidMap.set(guid, { type: "DG.Attribute", object: v2Attr })
      const attribute = data.addAttribute({
        id: toV3AttrId(guid), _cid, name, description, formula, _title, userType, editable, units, precision
      })
      if (attribute) {
        this.v3AttrMap.set(guid, attribute)
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
      this.guidMap.set(guid, { type: "DG.Case", object: _case })
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
