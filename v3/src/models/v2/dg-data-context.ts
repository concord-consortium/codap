import { IDataSet } from "../data/data-set"
import { DGCollectionClient } from "./dg-collection-client"
import { SCObject } from "../../v2/sc-compat"
import { selectAllCases, setSelectedCases } from "../data/data-set-utils"
import { canonicalizeAttributeName } from "../../data-interactive/data-interactive-utils"
import { mstAutorun } from "../../utilities/mst-autorun"
import { t } from "../../utilities/translation/translate"
import { DGDataContextAPI } from "./dg-data-context-api"
import { DGCase } from "./dg-case"
import { DGAttribute } from "./dg-attribute"

interface IApplyChange {
  operation: string
  cases?: DGCase[]
  select?: boolean
}

export class DGDataContext extends SCObject implements DGDataContextAPI {
  collections: DGCollectionClient[] = []
  disposer: () => void

  constructor(readonly data: IDataSet) {
    super()

    this.disposer = mstAutorun(() => {
      const prevCollections = this.collections
      this.collections = this.data.collections.map(dsCollection => {
        const foundCollection = prevCollections.find(dgCollection => dgCollection.id === dsCollection.id)
        return foundCollection ?? new DGCollectionClient(data, dsCollection, this)
      })
    }, { name: "DGDataContext collections autorun" }, data)
  }

  destroy() {
    this.disposer()
  }

  get id() {
    return this.data.id
  }

  get name() {
    return this.data.name
  }

  getCollectionByID(_id: string) {
    return this.collections?.find(({ collection: { id } }) => _id === id)
  }

  getCollectionByName(_name: string) {
    return this.collections?.find(({ collection: { name } }) => _name === name)
  }

  getCollectionForAttribute(attrId: string) {
    const dsCollection = this.data.getCollectionForAttribute(attrId)
    const dgCollectionClient = dsCollection && this.collections.find(client => client.id === dsCollection.id)
    return dgCollectionClient?.collection
  }

  getCollectionForCase(caseId: string) {
    const pseudoCase = this.data.caseGroupMap.get(caseId)
    const dsCollection = pseudoCase
                          ? this.data.getCollection(pseudoCase.collectionId)
                          : this.data.childCollection
    const collectionClient = this.getCollectionByID(dsCollection?.id ?? "")
    return collectionClient?.get("collection")
  }

  getAttribute(attrId: string) {
    const attribute = this.data.getAttribute(attrId)
    return attribute && new DGAttribute(this.data, attribute, this)
  }

  getAttrRefByName(name: string) {
    const attribute = this.data.getAttributeByName(name)
    return attribute && { attribute: new DGAttribute(this.data, attribute, this) }
  }

  getAttributes() {
    return this.data.attributes.map(attr => new DGAttribute(this.data, attr, this))
  }

  getCase(caseId: string) {
    return new DGCase(this.data, caseId, this)
  }

  getCases() {
    return this.data.items.map(({ __id__ }) => new DGCase(this.data, __id__, this))
  }

  getNewAttributeName() {
    return this.getUniqueAttributeName(t("DG.CaseTable.defaultAttrName"))
  }

  getUniqueAttributeName(baseName: string, allowNames?: string[]) {
    const attrNames = this.getAttributes().map(function (attr) {
      return attr.get('name')
    })
    let newName = canonicalizeAttributeName(baseName),
        suffix = 1
    while ((attrNames.indexOf(newName) >= 0) &&
      (!allowNames || (allowNames.indexOf(newName) < 0))) {
        newName = baseName + (++suffix)
    }
    return newName
  }

  applyChange(change: IApplyChange) {
    if (change.operation === "selectCases") {
      if (change.cases) {
        setSelectedCases(change.cases.map(aCase => aCase.get("id")), this.data)
      }
      else {
        selectAllCases(this.data, !!change.select)
      }
    }
  }
}
