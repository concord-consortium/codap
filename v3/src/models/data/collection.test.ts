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

    defaultItemData.addItemInfo("foo", "bar")
    defaultItemData.invalidate()
  })

  it("empty collections work as expected", () => {
    const c1 = CollectionModel.create({ name: "c1" })
    c1.updateCaseGroups()
    expect(c1.parent).toBeUndefined()
    expect(c1.child).toBeUndefined()
    expect(c1.isTopLevel).toBe(true)
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
    expect(defaultItemData.isHidden("foo")).toEqual(false)
    expect(defaultItemData.getValue("foo", "bar")).toBe("")
    expect(defaultItemData.addItemInfo("foo", "bar")).toBeNull()

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
    collection.moveAttribute("a", { before: "a" })
    expect(collection.getAttributeIndex("a")).toBe(0)
    expect(collection.getAttributeIndex("b")).toBe(1)
    collection.moveAttribute("a", { after: "b" })
    expect(collection.getAttributeIndex("b")).toBe(0)
    expect(collection.getAttributeIndex("a")).toBe(1)
    collection.moveAttribute("a", { after: "a" })
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
    expect(c1.isTopLevel).toBe(true)
    expect(c2.parent).toBe(c1)
    expect(c2.child).toBe(c3)
    expect(c2.isTopLevel).toBe(false)
    expect(c3.parent).toBe(c2)
    expect(c3.child).toBeUndefined()
    expect(c3.isTopLevel).toBe(false)

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

    const itemIdToCaseIdsMap = new Map<string, string[]>()

    function caseIdsForItems(itemIds: string[], index: number) {
      return itemIds.reduce<string[]>((allCaseIds, itemId) => {
        const caseIdsForItem = itemIdToCaseIdsMap.get(itemId) ?? []
        allCaseIds.push(caseIdsForItem[index])
        return allCaseIds
      }, [])
    }

    let attr1Values: [string, string] = ["a", "b"]
    const itemData: IItemData = {
      itemIds: () => ["0", "1", "2", "3", "4", "5"].map(id => `i${id}`),
      isHidden: () => false,
      getValue: (itemId: string, attrId: string) => {
        const baseId = itemId.substring(1)
        const index = +baseId
        return attrId === "a1"
                ? attr1Values[index % 2]
                : attrId === "a2"
                  ? baseId
                  : attrId === "a3"
                    ? "parent"
                    : "child"
      },
      addItemInfo: (itemId, caseId) => {
        const entry = itemIdToCaseIdsMap.get(itemId)
        if (entry) {
          entry.push(caseId)
        }
        else {
          itemIdToCaseIdsMap.set(itemId, [caseId])
        }
      },
      invalidate: jest.fn()
    }
    syncCollectionLinks(root.collections, itemData)

    function validateCases() {
      itemIdToCaseIdsMap.clear()

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
    }
    validateCases()

    expect(c1.caseIds.length).toBe(2)
    expect(c1.cases.length).toBe(2)
    expect(c2.caseIds).toEqual(caseIdsForItems(["i0", "i2", "i4", "i1", "i3", "i5"], 1))
    expect(c2.findParentCaseGroup("foo")).toBeUndefined()
    expect(c1.caseGroups[0].childCaseIds).toEqual(caseIdsForItems(["i0", "i2", "i4"], 1))
    expect(c1.caseGroups[0].childItemIds).toEqual(["i0", "i2", "i4"])
    expect(c1.caseGroups[1].childCaseIds).toEqual(caseIdsForItems(["i1", "i3", "i5"], 1))
    expect(c1.caseGroups[1].childItemIds).toEqual(["i1", "i3", "i5"])

    function validateItemCaseIds() {
      itemData.itemIds().forEach((itemId, index) => {
        const itemBaseId = itemId.substring(1)
        const [parentCaseId, childCaseId] = itemIdToCaseIdsMap.get(itemId)!
        const childItemIds = index % 2 ? ["i1", "i3", "i5"] : ["i0", "i2", "i4"]
        expect(c1.hasCase(parentCaseId)).toBe(true)
        expect(c1.getCaseIndex(parentCaseId)).toBe(index % 2)
        expect(c1.getCaseGroup(parentCaseId)!.childItemIds).toEqual(childItemIds)
        expect(c2.hasCase(childCaseId)).toBe(true)
        expect(c2.getCaseIndex(childCaseId)).toBe(index)
        expect(c2.getCaseGroup(childCaseId)!.childItemIds).toEqual([itemId])
        expect(c1.findParentCaseGroup(childCaseId)).toBe(c1.caseGroups[+itemBaseId % 2])
      })
    }

    validateItemCaseIds()

    function getCaseIdInfo(collection: ICollectionModel) {
      return {
        caseIds: [...collection.caseIds],
        caseIdsHash: collection.caseIdsHash,
        caseIdsOrderedHash: collection.caseIdsOrderedHash
      }
    }
    const origParentCollectionInfo = getCaseIdInfo(c1)
    const origChildCollectionInfo = getCaseIdInfo(c2)

    // serializes group key => case id map appropriately
    c1.prepareSnapshot()
    const aGroupKey = '[a]'
    const bGroupKey = '[b]'
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

    // adding constant attribute to the child collection doesn't invalidate grouping
    c2.addAttribute(a4)
    expect(itemData.invalidate).not.toHaveBeenCalled()

    // adding constant attribute to the child collection doesn't change case ids
    validateCases()
    expect(getCaseIdInfo(c1)).toEqual(origParentCollectionInfo)
    expect(getCaseIdInfo(c2)).toEqual(origChildCollectionInfo)
    validateItemCaseIds()

    // adding constant attribute to the parent collection does invalidate grouping
    c1.addAttribute(a3)
    expect(itemData.invalidate).toHaveBeenCalledTimes(1)

    // adding constant attribute to the parent collection doesn't change case ids
    validateCases()
    expect(getCaseIdInfo(c1)).toEqual(origParentCollectionInfo)
    expect(getCaseIdInfo(c2)).toEqual(origChildCollectionInfo)
    validateItemCaseIds()

    // removing attr1 from the parent collection invalidates grouping and changes parent case ids
    c1.removeAttribute(a1.id)
    expect(itemData.invalidate).toHaveBeenCalledTimes(2)
    validateCases()
    expect(c1.caseIds).not.toEqual(origParentCollectionInfo.caseIds)
    expect(c1.caseIdsHash).not.toEqual(origParentCollectionInfo.caseIdsHash)
    expect(c1.caseIdsOrderedHash).not.toEqual(origParentCollectionInfo.caseIdsOrderedHash)
    expect([...c2.caseIds].sort()).toEqual([...origChildCollectionInfo.caseIds].sort())
    expect(c2.caseIdsHash).toEqual(origChildCollectionInfo.caseIdsHash)
    expect(c2.caseIdsOrderedHash).not.toEqual(origChildCollectionInfo.caseIdsOrderedHash)

    // adding attr1 back to parent collection invalidates grouping and restores original parent case ids
    c1.addAttribute(a1)
    expect(itemData.invalidate).toHaveBeenCalledTimes(3)
    validateCases()
    expect(getCaseIdInfo(c1)).toEqual(origParentCollectionInfo)
    expect(getCaseIdInfo(c2)).toEqual(origChildCollectionInfo)
    validateItemCaseIds()

    // changing all b's to c's doesn't change case ids
    attr1Values = ["a", "c"]
    validateCases()
    expect(getCaseIdInfo(c1)).toEqual(origParentCollectionInfo)
    expect(getCaseIdInfo(c2)).toEqual(origChildCollectionInfo)
    expect(c1.groupKeyCaseIds.get(bGroupKey)).toBeUndefined()
    validateItemCaseIds()

    // hiding items works as expected
    itemData.isHidden = itemId => ["i0", "i2"].includes(itemId)
    validateCases()

    // when i0 & i2 are hidden, first parent case is odds, second is evens (except i0, i2)
    expect(c1.caseIds.length).toBe(2)
    expect(c1.cases.length).toBe(2)
    expect(c2.caseIds).toEqual(caseIdsForItems(["i1", "i3", "i5", "i4"], 1))
    expect(c2.findParentCaseGroup("foo")).toBeUndefined()
    expect(c1.caseGroups[0].childCaseIds).toEqual(caseIdsForItems(["i1", "i3", "i5"], 1))
    expect(c1.caseGroups[0].childItemIds).toEqual(["i1", "i3", "i5"])
    expect(c1.caseGroups[1].childCaseIds).toEqual(caseIdsForItems(["i4"], 1))
    expect(c1.caseGroups[1].childItemIds).toEqual(["i4"])
  })
})
