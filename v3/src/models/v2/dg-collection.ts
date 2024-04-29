import { ICollectionPropsModel, isCollectionModel } from "../data/collection"
import { IDataSet } from "../data/data-set"
import { mstAutorun } from "../../utilities/mst-autorun"
// eslint-disable-next-line import/no-cycle
import { DGAttribute } from "./dg-attribute"
import { DGCase } from "./dg-case"
import { DGDataContextAPI } from "./dg-data-context-api"
import { SCObject } from "../../v2/sc-compat"

export class DGCollection extends SCObject {
  attrs: DGAttribute[] = []
  disposer: () => void

  constructor(readonly data: IDataSet, readonly collection: ICollectionPropsModel, readonly api: DGDataContextAPI) {
    super()

    this.disposer = mstAutorun(() => {
      const prevAttrs = this.attrs
      const dsAttributes = isCollectionModel(this.collection)
                            ? this.collection.attributes
                            : this.data.ungroupedAttributes
      const newAttrs: DGAttribute[] = []
      dsAttributes.forEach(dsAttr => {
        if (dsAttr) {
          const attr = prevAttrs.find(dgAttr => dgAttr.get("id") === dsAttr.id) ??
                        new DGAttribute(this.data, dsAttr, this.api)
          if (attr) newAttrs.push(attr)
        }
      })
      this.attrs = newAttrs
    }, { name: "DGCollection attributes autorun" }, data)
  }

  destroy() {
    this.disposer()
  }

  get id() {
    return this.collection?.id ?? ""
  }

  get name() {
    return this.collection.name
  }

  get parent(): DGCollection | undefined {
    const index = this.data.getCollectionIndex(this.collection?.id)
    return index > 0
            ? new DGCollection(this.data, this.data.collections[index - 1], this.api)
            : undefined
  }

  getAttributeByID(attrId: string) {
    const attribute = this.data.getAttribute(attrId)
    return attribute && new DGAttribute(this.data, attribute, this.api)
  }

  getAttributeIDs() {
    return this.data.attributes.map(attr => attr.id)
  }

  get cases() {
    return this.data.getCasesForCollection(this.collection?.id)
            .map(({ __id__ }) => new DGCase(this.data, __id__, this.api))
  }

  getCaseIndexByID(caseId: string) {
    return this.data.caseIndexFromID(caseId)
  }

  numberOfVisibleAttributes() {
    return isCollectionModel(this.collection)
            ? this.collection.attributes.length
            : this.data.attributes.length
  }
}
