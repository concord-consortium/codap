import { DataSet, IDataSet, toCanonical } from "../data-model/data-set"
import {
  CodapV2Component, ICodapV2Attribute, ICodapV2Case, ICodapV2Collection, ICodapV2DataContext, ICodapV2Document
} from "./codap-v2-types"

export class CodapV2Document {
  private document: ICodapV2Document
  private guidMap: Record<number, { type: string, object: any }> = {}
  private data: Record<number, IDataSet> = {}

  constructor(document: ICodapV2Document) {
    this.document = document

    // register the document
    this.guidMap[document.guid] = { type: "DG.Document", object: document }

    this.registerComponents(document.components)
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

  getParentCase(aCase: ICodapV2Case) {
    const parentCaseId = aCase.parent
    return parentCaseId != null ? this.guidMap[parentCaseId]?.object as ICodapV2Case: undefined
  }

  registerComponents(components?: CodapV2Component[] | null) {
    components?.forEach(component => {
      const { guid, type, } = component
      this.guidMap[guid] = { type, object: component }
    })
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
    collections?.forEach((collection, index) => {
      const { attrs, cases, guid, type } = collection
      this.guidMap[guid] = { type, object: collection }

      // assumes hierarchical collection are in order parent => child
      const level = collections.length - index - 1
      this.registerAttributes(data, attrs, level)
      this.registerCases(data, cases, level)
    })
  }

  registerAttributes(data: IDataSet, attributes: ICodapV2Attribute[] | null, level: number) {
    attributes?.forEach(attr => {
      const { guid, name, type, formula } = attr
      this.guidMap[guid] = { type: type || "DG.Attribute", object: attr }
      data.addAttribute({ name, level, formula })
    })
  }

  registerCases(data: IDataSet, cases: ICodapV2Case[] | null, level: number) {
    cases?.forEach(_case => {
      const { guid, values } = _case
      this.guidMap[guid] = { type: "DG.Case", object: _case }
      // only add child/leaf cases
      if (level === 0) {
        const caseValues = toCanonical(data, values)
        // look up parent case attributes and add them to caseValues
        data.attributes.forEach(attr => {
          if (attr.level > 0) {
            let parentCase: ICodapV2Case | undefined
            do {
              parentCase = this.getParentCase(_case)
              if (parentCase && Object.prototype.hasOwnProperty.call(parentCase.values, attr.name)) {
                caseValues[attr.id] = parentCase.values[attr.name]
                break
              }
            } while (parentCase)
          }
        })
        data.addCases([caseValues])
      }
    })
  }
}
