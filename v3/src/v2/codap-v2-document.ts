import { IDocumentMetadata } from "../models/document/document-metadata"
import {
  CodapV2Context, ICodapV2Attribute, ICodapV2Case, ICodapV2Collection, isV2ExternalContext, isV2InternalContext
} from "./codap-v2-data-context-types"
import { CodapV2Component, ICodapV2DocumentJson } from "./codap-v2-types"

export class CodapV2Document {
  private document: ICodapV2DocumentJson
  private documentMetadata: IDocumentMetadata
  readonly guidMap = new Map<number, { type: string, object: any }>()

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
    // v3 doesn't support external data contexts
    return this.document.contexts.filter(isV2InternalContext)
  }

  get components() {
    return this.document.components
  }

  get globalValues() {
    return this.document.globalValues
  }

  getDocumentMetadata() {
    return this.documentMetadata
  }

  getDocumentTitle() {
    return this.documentMetadata.filename?.split(".")[0] ?? this.document.name
  }

  getParentCase(aCase: ICodapV2Case) {
    const parentCaseId = aCase.parent
    return parentCaseId != null ? this.guidMap.get(parentCaseId)?.object as ICodapV2Case | undefined : undefined
  }

  getV2DataContext(v2Id: number) {
    const entry = this.guidMap.get(v2Id)
    if (!entry?.type) return
    return ["DG.DataContext", "DG.GameContext"].includes(entry.type) ? entry.object as CodapV2Context : undefined
  }

  getV2Collection(v2Id: number) {
    const entry = this.guidMap.get(v2Id)
    return entry?.type === "DG.Collection" ? entry.object as ICodapV2Collection : undefined
  }

  getV2CollectionByIndex(collectionIndex = 0, contextIndex = 0) {
    const context = this.contexts[contextIndex]
    if (isV2ExternalContext(context)) return
    return isV2InternalContext(context) ? context.collections[collectionIndex] : undefined
  }

  getV2Attribute(v2Id: number) {
    const entry = this.guidMap.get(v2Id)
    return entry?.type === "DG.Attribute" ? entry.object as ICodapV2Attribute : undefined
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
      const { guid, type = "DG.DataContext", document } = context
      if (document && this.guidMap.get(document)?.type !== "DG.Document") {
        console.warn("CodapV2Document.registerContexts: context with invalid document guid:", context.document)
      }
      this.guidMap.set(guid, { type, object: context })
      this.registerCollections(context.collections)
    })
  }

  registerCollections(collections?: ICodapV2Collection[]) {
    collections?.forEach(collection => {
      const { guid, type = "DG.Collection" } = collection
      this.guidMap.set(guid, { type, object: collection })
      this.registerAttributes(collection.attrs)
      this.registerCases(collection.cases)
    })
  }

  registerAttributes(attributes?: ICodapV2Attribute[]) {
    attributes?.forEach(attribute => {
      const { guid } = attribute
      this.guidMap.set(guid, { type: "DG.Attribute", object: attribute })
    })
  }

  registerCases(cases?: ICodapV2Case[]) {
    cases?.forEach(aCase => {
      const { guid } = aCase
      this.guidMap.set(guid, { type: "DG.Case", object: aCase })
    })
  }
}
