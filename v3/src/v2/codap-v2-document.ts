import { IAttribute } from "../models/data/attribute"
import { IDocumentMetadata } from "../models/document/document-metadata"
import { ISharedCaseMetadata, SharedCaseMetadata } from "../models/shared/shared-case-metadata"
import { ISharedDataSet, SharedDataSet } from "../models/shared/shared-data-set"
import { toV3DataSetId } from "../utilities/codap-utils"
import {
  CodapV2Component, CodapV2Context, ICodapV2DocumentJson, isV2ExternalContext, isV2InternalContext
} from "./codap-v2-types"
import { ICodapV2Attribute, ICodapV2Case, ICodapV2Collection } from "./codap-v2-data-set-types"
import { CodapV2DataSetImporter } from "./codap-v2-data-set-importer"

interface V2CaseIdInfo {
  // cumulative list of ordered attribute names used for grouping
  groupAttrNames: string[]
  // mapping from group key (parent attribute values) to case id
  groupKeyCaseIds: Map<string, string>
}

export class CodapV2Document {
  private document: ICodapV2DocumentJson
  private documentMetadata: IDocumentMetadata
  private guidMap = new Map<number, { type: string, object: any }>()
  private dataMap = new Map<number, ISharedDataSet>()
  // index into the array is `level`
  private v2CaseIdInfoArray: V2CaseIdInfo[] = []
  private v3AttrMap = new Map<number, IAttribute>()
  private caseMetadataMap = new Map<number, ISharedCaseMetadata>()

  constructor(document: ICodapV2DocumentJson, metadata: IDocumentMetadata = {}) {
    this.document = document
    this.documentMetadata = metadata
    // register the document
    this.guidMap.set(document.guid, { type: "DG.Document", object: document })

    this.registerContexts(document.contexts)
    this.registerComponents(document.components)
  }

  get name() {
    return this.document.name
  }

  get contexts() {
    return this.document.contexts
  }

  get dataContexts() {
    return this.document.contexts.filter(isV2InternalContext)
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

  get caseMetadata() {
    return Array.from(this.caseMetadataMap.values())
  }

  getDocumentMetadata() {
    return this.documentMetadata
  }

  getDocumentTitle() {
    return this.documentMetadata.filename?.split(".")[0] ?? this.document.name
  }

  getDataAndMetadata(v2Id?: number) {
    return { data: this.dataMap.get(v2Id ?? -1), metadata: this.caseMetadataMap.get(v2Id ?? -1) }
  }

  getParentCase(aCase: ICodapV2Case) {
    const parentCaseId = aCase.parent
    return parentCaseId != null ? this.guidMap.get(parentCaseId)?.object as ICodapV2Case | undefined : undefined
  }

  getV2Collection(v2Id: number) {
    const entry = this.guidMap.get(v2Id)
    return entry?.type === "DG.Collection" ? entry.object as ICodapV2Collection : undefined
  }

  getV2CollectionByIndex(collectionIndex = 0, contextIndex = 0) {
    const context = this.contexts[contextIndex]
    return isV2InternalContext(context) ? context.collections[collectionIndex] : undefined
  }

  getV2Attribute(v2Id: number) {
    const entry = this.guidMap.get(v2Id)
    return entry?.type === "DG.Attribute" ? entry.object as ICodapV2Attribute : undefined
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

  registerContexts(contexts?: CodapV2Context[]) {
    contexts?.forEach(context => {
      // TODO_V2_IMPORT_IGNORE: external contexts are not imported
      // There are 75 cases of external contexts in cfm-shared
      // This refers to an obsolescent form of document storage no longer used at all. Ignore!
      if (isV2ExternalContext(context)) return
      const { guid, type = "DG.DataContext", document, name = "", title } = context
      if (document && this.guidMap.get(document)?.type !== "DG.Document") {
        console.warn("CodapV2Document.registerContexts: context with invalid document guid:", context.document)
      }
      this.guidMap.set(guid, { type, object: context })
      const dataSetId = toV3DataSetId(guid)
      const sharedDataSet = SharedDataSet.create({ dataSet: { id: dataSetId, name, _title: title } })
      this.dataMap.set(guid, sharedDataSet)
      const caseMetadata = SharedCaseMetadata.create({ data: dataSetId })
      this.caseMetadataMap.set(guid, caseMetadata)

      const dataSetImporter = new CodapV2DataSetImporter(this.guidMap, this.v3AttrMap)
      dataSetImporter.importContext(context, sharedDataSet.dataSet, caseMetadata)
    })
  }
}
