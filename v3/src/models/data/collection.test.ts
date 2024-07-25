import { destroy, getSnapshot, isAlive, types } from "mobx-state-tree"
import { Attribute, IAttribute } from "./attribute"
import {
  CollectionModel, ICollectionModel, IItemData, defaultItemData, isCollectionModel, syncCollectionLinks
} from "./collection"

const Tree = types.model("Tree", {
  attributes: types.array(Attribute),
  collections: types.array(CollectionModel)
})
.actions(self => ({
  addCollection(collection: ICollectionModel) {
    self.collections.push(collection)
  },
  addAttribute(attribute: IAttribute) {
    self.attributes.push(attribute)
  },
  destroyAttribute(attribute: IAttribute) {
    destroy(attribute)
  }
}))

describe("CollectionModel", () => {

  it("Simple properties work as expected", () => {
    const withName = CollectionModel.create({ name: "name" })
    expect(withName.title).toBe("name")
    withName.setTitle("newName")
    expect(withName.title).toBe("newName")
    expect(isCollectionModel(withName)).toBe(true)

    const withNameAndTitle = CollectionModel.create({ name: "name", _title: "title" })
    expect(withNameAndTitle.title).toBe("title")
    withNameAndTitle.setTitle("newTitle")
    expect(withNameAndTitle.title).toBe("newTitle")
    expect(isCollectionModel(withNameAndTitle)).toBe(true)
  })

  it("labels work as expected", () => {
    const c1 = CollectionModel.create({ name: "c1" })
    expect(c1.labels).toBeUndefined()
    c1.setSingleCase("singleCase")
    expect(c1.labels?.singleCase).toBe("singleCase")
    c1.setLabels({
      singleCase: "singleCase",
      pluralCase: "pluralCase",
      singleCaseWithArticle: "singleCaseWithArticle",
      setOfCases: "setOfCases",
      setOfCasesWithArticle: "setOfCasesWithArticle"
    })
    expect(c1.labels?.singleCase).toBe("singleCase")
    expect(c1.labels?.pluralCase).toBe("pluralCase")
    expect(c1.labels?.singleCaseWithArticle).toBe("singleCaseWithArticle")
    expect(c1.labels?.setOfCases).toBe("setOfCases")
    expect(c1.labels?.setOfCasesWithArticle).toBe("setOfCasesWithArticle")

    const c2 = CollectionModel.create({ name: "c2" })
    expect(c2.labels).toBeUndefined()
    c2.setPluralCase("pluralCase")
    expect(c2.labels?.pluralCase).toBe("pluralCase")
    c2.setSingleCase("singleCase")
    expect(c2.labels?.singleCase).toBe("singleCase")

    const c3 = CollectionModel.create({ name: "c3" })
    expect(c3.labels).toBeUndefined()
    c3.setSingleCaseWithArticle("singleCaseWithArticles")
    expect(c3.labels?.singleCaseWithArticle).toBe("singleCaseWithArticles")

    const c4 = CollectionModel.create({ name: "c4" })
    expect(c4.labels).toBeUndefined()
    c4.setSetOfCases("setOfCases")
    expect(c4.labels?.setOfCases).toBe("setOfCases")

    const c5 = CollectionModel.create({ name: "c5" })
    expect(c5.labels).toBeUndefined()
    c5.setSetOfCasesWithArticle("setOfCasesWithArticle")
    expect(c5.labels?.setOfCasesWithArticle).toBe("setOfCasesWithArticle")
  })

  it("empty collections work as expected", () => {
    const c1 = CollectionModel.create({ name: "c1" })
    c1.updateCaseGroups()
    expect(c1.caseIds).toEqual([])
    expect(c1.caseIdToIndexMap.size).toBe(0)
    expect(c1.caseIdToGroupKeyMap.size).toBe(0)
    expect(c1.groupKeyCaseId()).toBeUndefined()
    expect(c1.attributesArray).toEqual([])
    expect(c1.sortedDataAttributes).toEqual([])
    expect(c1.allParentAttrs).toEqual([])
    expect(c1.allParentDataAttrs).toEqual([])
    expect(c1.allAttributes).toEqual([])
    expect(c1.allDataAttributes).toEqual([])
    expect(c1.sortedParentDataAttrs).toEqual([])
    expect(c1.cases).toEqual([])
    expect(c1.caseGroups).toEqual([])

    expect(defaultItemData.itemIds()).toEqual([])
    expect(defaultItemData.getValue("foo", "bar")).toBe("")

    jestSpyConsole("warn", spy => {
      c1.addChildCase("foo", "bar")
      expect(spy).toHaveBeenCalled()
    })

    expect(c1.getCaseGroup("foo")).toBeUndefined()
    expect(c1.findParentCaseGroup("foo")).toBeUndefined()
    c1.completeCaseGroups([{} as any])
  })

  it("handles undefined attribute references", () => {
    const tree = Tree.create()
    const collection = CollectionModel.create()
    expect(isCollectionModel(collection)).toBe(true)
    tree.addCollection(collection)
    const attribute = Attribute.create({ id: "a", name: "a" })
    tree.addAttribute(attribute)
    collection.addAttribute(attribute)
    expect(collection.attributes.length).toBe(1)

    expect(collection.sortedDataAttributes).toEqual([attribute])
    expect(collection.allParentAttrs).toEqual([])
    expect(collection.allParentDataAttrs).toEqual([])
    expect(collection.allAttributes).toEqual([attribute])
    expect(collection.allDataAttributes).toEqual([attribute])
    expect(collection.sortedParentDataAttrs).toEqual([])

    tree.destroyAttribute(attribute)
    expect(collection.attributes.length).toBe(0)
    expect(collection.getAttribute("a")).toBeUndefined()
    expect(collection.getAttributeIndex("a")).toBe(-1)
    expect(collection.getAttributeByName("a")).toBeUndefined()
    // removing a non-existent attribute is a no-op
    collection.removeAttribute("a")
    expect(collection.attributes.length).toBe(0)

    // MST auto-removes undefined safeReferences from arrays,
    // but we force an undefined reference for testing purposes
    collection.addAttribute(undefined as any as IAttribute)
    expect(collection.getAttribute("a")).toBeUndefined()
    expect(collection.getAttributeIndex("a")).toBe(-1)
    expect(collection.getAttributeByName("a")).toBeUndefined()
  })

  it("can add/move/remove attributes", () => {
    const tree = Tree.create()
    const collection = CollectionModel.create()
    expect(isCollectionModel(collection)).toBe(true)
    tree.addCollection(collection)
    const attrA = Attribute.create({ id: "a", name: "a" })
    tree.addAttribute(attrA)
    expect(isAlive(attrA)).toBe(true)
    collection.addAttribute(attrA)
    expect(isAlive(attrA)).toBe(true)
    expect(collection.attributes.length).toBe(1)
    expect(collection.getAttribute("a")).toBe(attrA)
    expect(collection.getAttributeByName("a")).toBe(attrA)
    expect(collection.getAttributeIndex("a")).toBe(0)

    const attrB = Attribute.create({ id: "b", name: "b" })
    tree.addAttribute(attrB)
    collection.addAttribute(attrB, { before: "a" })
    expect(collection.attributes.length).toBe(2)
    expect(collection.getAttributeByName("a")).toBe(attrA)
    expect(collection.getAttributeByName("b")).toBe(attrB)
    expect(collection.getAttributeIndex("b")).toBe(0)
    expect(collection.getAttributeIndex("a")).toBe(1)

    collection.removeAttribute("a")
    expect(collection.attributes.length).toBe(1)
    collection.addAttribute(attrA, { after: "b" })
    expect(collection.attributes.length).toBe(2)
    expect(collection.getAttributeIndex("b")).toBe(0)
    expect(collection.getAttributeIndex("a")).toBe(1)
    collection.moveAttribute("a", { before: "b" })
    expect(collection.getAttributeIndex("a")).toBe(0)
    expect(collection.getAttributeIndex("b")).toBe(1)
    collection.moveAttribute("a", { after: "b" })
    expect(collection.getAttributeIndex("b")).toBe(0)
    expect(collection.getAttributeIndex("a")).toBe(1)
    collection.removeAttribute("b")
    expect(collection.attributes.length).toBe(1)
    expect(collection.getAttributeByName("a")).toBeDefined()
    expect(collection.getAttributeByName("b")).toBeUndefined()
    collection.removeAttribute("a")
    expect(collection.attributes.length).toBe(0)
  })

  it("can synchronize volatile parent/child links and retrieve parent attributes", () => {
    // root model so attribute references can be used in collections
    const Model = types.model("Model", {
      attributes: types.array(Attribute),
      collections: types.array(CollectionModel)
    })
    const collections = [{ id: "c1", name: "c1" }, { id: "c2", name: "c2" }, { id: "c3", name: "c3" }]
    const a1 = Attribute.create({ id: "a1", name: "a1" })
    const a2 = Attribute.create({ id: "a2", name: "a2" })
    const a3 = Attribute.create({ id: "a3", name: "a3" })
    const a4 = Attribute.create({ id: "a4", name: "a4" })
    const attributes = [a1, a2, a3, a4]
    const root = Model.create({ attributes, collections })
    syncCollectionLinks(root.collections, defaultItemData)
    const [c1, c2, c3] = root.collections
    expect(c1.parent).toBeUndefined()
    expect(c1.child).toBe(c2)
    expect(c2.parent).toBe(c1)
    expect(c2.child).toBe(c3)
    expect(c3.parent).toBe(c2)
    expect(c3.child).toBeUndefined()

    c1.addAttribute(a1)
    c2.addAttribute(a2)
    c2.addAttribute(a3)
    c3.addAttribute(a4)
    expect(c1.allParentDataAttrs.map(attr => attr.id)).toEqual([])
    expect(c2.allParentDataAttrs.map(attr => attr.id)).toEqual(["a1"])
    expect(c3.allParentDataAttrs.map(attr => attr.id)).toEqual(["a1", "a2", "a3"])
  })

  it("can group cases appropriately", () => {
    // root model so attribute references can be used in collections
    const Model = types.model("Model", {
      attributes: types.array(Attribute),
      collections: types.array(CollectionModel)
    })
    const collections = [{ id: "c1", name: "groups" }, { id: "c2", name: "cases" }]
    const a1 = Attribute.create({ id: "a1", name: "a1" })
    const a2 = Attribute.create({ id: "a2", name: "a2" })
    const a3 = Attribute.create({ id: "a3", name: "a3" })
    const a4 = Attribute.create({ id: "a4", name: "a4" })
    const attributes = [a1, a2, a3, a4]
    const root = Model.create({ attributes, collections })
    const [c1, c2] = root.collections
    c1.addAttribute(a1)
    c2.addAttribute(a2)

    const itemIdToCaseIdMap = new Map<string, string>()

    function caseIdsForItems(itemIds: string[]) {
      return itemIds.map(itemId => itemIdToCaseIdMap.get(itemId))
    }

    const itemData: IItemData = {
      itemIds: () => ["0", "1", "2", "3", "4", "5"].map(id => `i${id}`),
      getValue: (itemId: string, attrId: string) => {
        const baseId = itemId.substring(1)
        const index = +baseId
        return attrId === "a1"
                ? ["a", "b"][index % 2]
                : baseId
      },
      addItemInfo: (itemId, index, caseId) => itemIdToCaseIdMap.set(itemId, caseId),
      invalidate: jest.fn()
    }
    syncCollectionLinks(root.collections, itemData)

    root.collections.forEach((collection, index) => {
      // update the cases
      collection.updateCaseGroups()

      expect(collection.findParentCaseGroup("foo")).toBeUndefined()
    })

    root.collections.forEach((collection, index) => {
      // sort child collection cases into groups
      const parentCaseGroups = index > 0 ? root.collections[index - 1].caseGroups : undefined
      collection.completeCaseGroups(parentCaseGroups)
    })

    expect(c1.caseIds.length).toBe(2)
    expect(c1.cases.length).toBe(2)
    expect(c2.caseIds).toEqual(caseIdsForItems(["i0", "i2", "i4", "i1", "i3", "i5"]))
    expect(c2.findParentCaseGroup("foo")).toBeUndefined()
    expect(c1.caseGroups[0].childCaseIds).toEqual(caseIdsForItems(["i0", "i2", "i4"]))
    expect(c1.caseGroups[0].childItemIds).toEqual(["i0", "i2", "i4"])
    expect(c1.caseGroups[1].childCaseIds).toEqual(caseIdsForItems(["i1", "i3", "i5"]))
    expect(c1.caseGroups[1].childItemIds).toEqual(["i1", "i3", "i5"])

    itemData.itemIds().forEach((itemId, index) => {
      const itemBaseId = itemId.substring(1)
      const caseId = itemIdToCaseIdMap.get(itemId)!
      expect(c2.hasCase(caseId)).toBe(true)
      expect(c2.getCaseIndex(caseId)).toBe(index)
      expect(c2.getCaseGroup(caseId)!.childItemIds).toEqual([itemId])
      expect(c1.findParentCaseGroup(caseId)).toBe(c1.caseGroups[+itemBaseId % 2])
    })

    // serializes group key => case id map appropriately
    c1.prepareSnapshot()
    const aGroupKey = '["a"]'
    const bGroupKey = '["b"]'
    const aCaseId = c1.caseIds[0]
    const bCaseId = c1.caseIds[1]
    expect(c1._groupKeyCaseIds).toEqual([[aGroupKey, aCaseId], [bGroupKey, bCaseId]])

    const c1Snap = getSnapshot(c1)
    const c1New = CollectionModel.create(c1Snap)
    expect(c1New.groupKeyCaseIds.get(aGroupKey)).toBe(aCaseId)
    expect(c1New.groupKeyCaseIds.get(bGroupKey)).toBe(bCaseId)

    // childmost collection has 1:1 case ids with items
    c2.prepareSnapshot()
    expect(c2._groupKeyCaseIds!.length).toEqual(itemData.itemIds().length)

    // adding an attribute to the child collection doesn't invalidate grouping
    c2.addAttribute(a4)
    expect(itemData.invalidate).not.toHaveBeenCalled()

    // adding an attribute to the parent collection does invalidate grouping
    c1.addAttribute(a3)
    expect(itemData.invalidate).toHaveBeenCalledTimes(1)
  })
})
