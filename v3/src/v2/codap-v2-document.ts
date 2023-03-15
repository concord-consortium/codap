import { CollectionModel } from "../models/data/collection"
import { DataSet, IDataSet, toCanonical } from "../models/data/data-set"
import {
  CodapV2Component, ICodapV2Attribute, ICodapV2Case, ICodapV2Collection, ICodapV2DataContext, ICodapV2DocumentJson
} from "./codap-v2-types"

export class CodapV2Document {
  private document: ICodapV2DocumentJson
  private guidMap: Record<number, { type: string, object: any }> = {}
  private data: Record<number, IDataSet> = {}

  constructor(document: ICodapV2DocumentJson) {
    this.document = document

    // register the document
    this.guidMap[document.guid] = { type: "DG.Document", object: document }

    this.registerComponents(document.components)
    this.registerContexts(document.contexts)
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

  get datasets() {
    return Object.values(this.data)
  }

  getParentCase(aCase: ICodapV2Case) {
    const parentCaseId = aCase.parent
    return parentCaseId != null ? this.guidMap[parentCaseId]?.object as ICodapV2Case: undefined
  }

  getAttribute(anID: number) {
    return this.guidMap[anID]
  }

  registerComponents(components?: CodapV2Component[]) {
    components?.forEach(component => {
      const { guid, type, } = component
      this.guidMap[guid] = { type, object: component }
    })
  }

  registerContexts(contexts?: ICodapV2DataContext[]) {
    contexts?.forEach(context => {
      const { guid, type = "DG.DataContext", document, name = "", collections = [] } = context
      if (document && this.guidMap[document]?.type !== "DG.Document") {
        console.warn("CodapV2Document.registerContexts: context with invalid document guid:", context.document)
      }
      this.guidMap[guid] = { type, object: context }
      this.data[guid] = DataSet.create({ name })

      this.registerCollections(this.data[guid], collections)
    })
  }

  registerCollections(data: IDataSet, collections: ICodapV2Collection[]) {
    collections.forEach((collection, index) => {
      const { attrs = [], cases = [], guid, name = "", title = "", type = "DG.Collection" } = collection
      this.guidMap[guid] = { type, object: collection }

      // assumes hierarchical collection are in order parent => child
      const level = collections.length - index - 1  // 0 === child-most
      this.registerAttributes(data, attrs, level)
      this.registerCases(data, cases, level)

      if (level > 0) {
        const collectionModel = CollectionModel.create({ name, title })
        attrs.forEach(attr => {
          const attrModel = data.attrFromName(attr.name)
          attrModel && collectionModel.addAttribute(attrModel)
        })
        data.addCollection(collectionModel)
      }
      else {
        data.ungrouped.setName(name)
        data.ungrouped.setTitle(title)
      }
    })
  }

  registerAttributes(data: IDataSet, attributes: ICodapV2Attribute[], level: number) {
    attributes.forEach(attr => {
      const { guid, name = "", title = "", type = "DG.Attribute", formula } = attr
      this.guidMap[guid] = { type: type || "DG.Attribute", object: attr }
      data.addAttribute({ name, formula, title })
    })
  }

  registerCases(data: IDataSet, cases: ICodapV2Case[], level: number) {
    cases.forEach(_case => {
      const { guid, values } = _case
      this.guidMap[guid] = { type: "DG.Case", object: _case }
      // only add child/leaf cases
      if (level === 0) {
        let caseValues = toCanonical(data, values)
        // look up parent case attributes and add them to caseValues
        for (let parentCase = this.getParentCase(_case); parentCase; parentCase = this.getParentCase(parentCase)) {
          caseValues = { ...(parentCase.values ? toCanonical(data, parentCase.values) : undefined), ...caseValues }
        }
        data.addCases([caseValues])
      }
    })
  }
}
