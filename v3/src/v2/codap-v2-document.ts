import { DataSet, IDataSet, toCanonical } from "../data-model/data-set"
import {
  ICodapV2Attribute, ICodapV2Case, ICodapV2Collection, ICodapV2DataContext, ICodapV2Document
} from "./codap-v2-types"

export class CodapV2Document {
  private document: ICodapV2Document
  private guidMap: Record<number, { type: string, object: any }> = {}
  private data: Record<number, IDataSet> = {}

  constructor(document: ICodapV2Document) {
    this.document = document

    // register the document
    this.guidMap[document.guid] = { type: "DG.Document", object: document }

    this.registerContexts(document.contexts)
  }

  get contexts() {
    return this.document.contexts || []
  }

  get components() {
    return this.document.components || []
  }

  get globalValues() {
    return this.document.globalValues || []
  }

  get datasets() {
    return Object.values(this.data)
  }

  registerContexts(contexts?: ICodapV2DataContext[] | null) {
    contexts?.forEach(context => {
      const { guid, type, document, name, collections } = context
      if (document && this.guidMap[document]?.type !== "DG.Document") {
        console.warn("CodapV2Document.registerContexts: context with invalid guid:", context.document)
      }
      this.guidMap[guid] = { type, object: context }
      this.data[guid] = DataSet.create({ name })

      this.registerCollections(this.data[guid], collections)
    })
  }

  registerCollections(data: IDataSet, collections?: ICodapV2Collection[] | null) {
    collections?.forEach(collection => {
      const { attrs, cases, guid, type } = collection
      this.guidMap[guid] = { type, object: collection }

      this.registerAttributes(data, attrs)
      this.registerCases(data, cases)
    })
  }

  registerAttributes(data: IDataSet, attributes?: ICodapV2Attribute[] | null) {
    attributes?.forEach(attr => {
      const { guid, name, type, formula } = attr
      this.guidMap[guid] = { type: type || "DG.Attribute", object: attr }
      data.addAttribute({ name, formula })
    })
  }

  registerCases(data: IDataSet, cases?: ICodapV2Case[] | null) {
    cases?.forEach(_case => {
      const { guid, values } = _case
      this.guidMap[guid] = { type: "DG.Case", object: _case }
      data.addCases([toCanonical(data, values)])
    })
  }
}
