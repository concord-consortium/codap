import { SetRequired } from "type-fest"
import { IAttribute } from "../models/data/attribute"
import { ICollectionModel, ICollectionModelSnapshot } from "../models/data/collection"
import { IDataSet, toCanonical } from "../models/data/data-set"
import { v2NameTitleToV3Title } from "../models/data/v2-model"
import { ISharedCaseMetadata, SharedCaseMetadata } from "../models/shared/shared-case-metadata"
import { ISharedDataSet, SharedDataSet } from "../models/shared/shared-data-set"
import { toV3AttrId, toV3CaseId, toV3CollectionId, toV3DataSetId } from "../utilities/codap-utils"
import {
  CodapV2Component, ICodapV2Attribute, ICodapV2Case, ICodapV2Collection, ICodapV2DataContext, ICodapV2DocumentJson,
  v3TypeFromV2TypeString } from "./codap-v2-types"

export class CodapV2Document {
  private document: ICodapV2DocumentJson
  private guidMap = new Map<number, { type: string, object: any }>()
  private dataMap = new Map<number, ISharedDataSet>()
  private v3AttrMap = new Map<number, IAttribute>()
  private metadataMap = new Map<number, ISharedCaseMetadata>()

  constructor(document: ICodapV2DocumentJson) {
    this.document = document

    // register the document
    this.guidMap.set(document.guid, { type: "DG.Document", object: document })

    this.registerContexts(document.contexts)
    this.registerComponents(document.components)
  }

  get contexts() {
    return this.document.contexts
  }

  get components() {
    return this.document.components
  }

  get globalValues() {
    return this.document.globalValues
  }

  get dataSets() {
    return Array.from(this.dataMap.values())
  }

  get metadata() {
    return Array.from(this.metadataMap.values())
  }

  getDataAndMetadata(v2Id?: number) {
    return { data: this.dataMap.get(v2Id ?? -1), metadata: this.metadataMap.get(v2Id ?? -1) }
  }

  getParentCase(aCase: ICodapV2Case) {
    const parentCaseId = aCase.parent
    return parentCaseId != null ? this.guidMap.get(parentCaseId)?.object as ICodapV2Case | undefined : undefined
  }

  getV2Attribute(v2Id: number) {
    return this.guidMap.get(v2Id)
  }

  getV3Attribute(v2Id: number) {
    return this.v3AttrMap.get(v2Id)
  }

  registerComponents(components?: CodapV2Component[]) {
    components?.forEach(component => {
      const { guid, type } = component
      this.guidMap.set(guid, { type, object: component })
    })
  }

  registerContexts(contexts?: ICodapV2DataContext[]) {
    contexts?.forEach(context => {
      const { guid, type = "DG.DataContext", document, name = "", collections = [] } = context
      if (document && this.guidMap.get(document)?.type !== "DG.Document") {
        console.warn("CodapV2Document.registerContexts: context with invalid document guid:", context.document)
      }
      this.guidMap.set(guid, { type, object: context })
      const dataSetId = toV3DataSetId(guid)
      const sharedDataSet = SharedDataSet.create({ dataSet: { id: dataSetId, name } })
      this.dataMap.set(guid, sharedDataSet)
      const metadata = SharedCaseMetadata.create({ data: dataSetId })
      this.metadataMap.set(guid, metadata)

      this.registerCollections(sharedDataSet.dataSet, metadata, collections)
    })
  }

  registerCollections(data: IDataSet, metadata: ISharedCaseMetadata, collections: ICodapV2Collection[]) {
    let prevCollection: ICollectionModel | undefined
    collections.forEach((collection, index) => {
      const { attrs = [], cases = [], guid, name = "", title, type = "DG.Collection" } = collection
      const _title = v2NameTitleToV3Title(name, title)
      this.guidMap.set(guid, { type, object: collection })

      // assumes hierarchical collections are in order parent => child
      const level = collections.length - index - 1  // 0 === child-most
      this.registerAttributes(data, metadata, attrs, level)
      this.registerCases(data, cases, level)

      const attributes = attrs.map(attr => {
        const attrModel = data.attrFromName(attr.name)
        return attrModel?.id
      }).filter(attrId => !!attrId) as string[]

      const collectionSnap: SetRequired<ICollectionModelSnapshot, "attributes"> = {
        id: toV3CollectionId(guid),
        name,
        _title,
        attributes
      }
      // remove default collection
      if (index === 0) {
        data.removeCollection(data.collections[0])
      }
      // add the imported collections
      prevCollection = data.addCollection(collectionSnap, { after: prevCollection?.id })
    })
  }

  registerAttributes(data: IDataSet, metadata: ISharedCaseMetadata, attributes: ICodapV2Attribute[], level: number) {
    attributes.forEach(v2Attr => {
      const {
        guid, description: v2Description, name = "", title: v2Title, type: v2Type, formula: v2Formula,
        editable: v2Editable, unit: v2Unit, precision: v2Precision
      } = v2Attr
      const _title = v2NameTitleToV3Title(name, v2Title)
      const description = v2Description ?? undefined
      const userType = v3TypeFromV2TypeString(v2Type)
      const formula = v2Formula ? { display: v2Formula } : undefined
      const editable = v2Editable == null || !!v2Editable
      const precision = v2Precision == null || v2Precision === "" ? undefined : +v2Precision
      const units = v2Unit ?? undefined
      this.guidMap.set(guid, { type: "DG.Attribute", object: v2Attr })
      const attribute = data.addAttribute({
        id: toV3AttrId(guid), name, description, formula, _title, userType, editable, units, precision
      })
      if (attribute) {
        this.v3AttrMap.set(guid, attribute)
        if (v2Attr.hidden) {
          metadata.setIsHidden(attribute.id, true)
        }
      }
    })
  }

  registerCases(data: IDataSet, cases: ICodapV2Case[], level: number) {
    cases.forEach(_case => {
      const { guid, values } = _case
      this.guidMap.set(guid, { type: "DG.Case", object: _case })
      // only add child/leaf cases (for now)
      if (level === 0) {
        let caseValues = { __id__: toV3CaseId(guid), ...toCanonical(data, values) }
        // look up parent case attributes and add them to caseValues
        for (let parentCase = this.getParentCase(_case); parentCase; parentCase = this.getParentCase(parentCase)) {
          caseValues = { ...(parentCase.values ? toCanonical(data, parentCase.values) : undefined), ...caseValues }
        }
        data.addCases([caseValues])
      }
    })
  }
}
