import { destroy, isAlive, types } from "mobx-state-tree"
import { Attribute, IAttribute } from "./attribute"
import { CollectionModel, ICollectionModel, isCollectionModel } from "./collection"

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

  it("handles undefined references", () => {
    const tree = Tree.create()
    const collection = CollectionModel.create()
    expect(isCollectionModel(collection)).toBe(true)
    tree.addCollection(collection)
    const attribute = Attribute.create({ id: "a", name: "a" })
    tree.addAttribute(attribute)
    collection.addAttribute(attribute)
    expect(collection.attributes.length).toBe(1)
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

  it("can add/remove cases", () => {
    const collection = CollectionModel.create()
    expect(isCollectionModel(collection)).toBe(true)
    expect(collection.caseIds.length).toBe(0)
    expect(collection.caseIdMap.size).toBe(0)
    collection.addCases(["case3", "case6"])
    expect(collection.hasCase("case2")).toBe(false)
    expect(collection.hasCase("case3")).toBe(true)
    expect(collection.caseIds.length).toBe(2)
    expect(collection.caseIdMap.size).toBe(2)
    collection.addCases(["case1", "case2"], { before: "case3" })
    expect(collection.hasCase("case2")).toBe(true)
    expect(collection.caseIds.length).toBe(4)
    expect(collection.caseIdMap.size).toBe(4)
    expect(collection.caseIds).toEqual(["case1", "case2", "case3", "case6"])
    collection.addCases(["case4", "case5"], { after: "case3" })
    expect(collection.caseIds.length).toBe(6)
    expect(collection.caseIdMap.size).toBe(6)
    expect(collection.caseIds).toEqual(["case1", "case2", "case3", "case4", "case5", "case6"])

    collection.removeCases(["case1", "case3", "case5"])
    expect(collection.caseIds.length).toBe(3)
    expect(collection.caseIdMap.size).toBe(3)
    expect(collection.hasCase("case2")).toBe(true)
    expect(collection.hasCase("case3")).toBe(false)

    collection.removeCases(["case2", "case4", "case6"])
    expect(collection.caseIds.length).toBe(0)
    expect(collection.caseIdMap.size).toBe(0)
    expect(collection.hasCase("case2")).toBe(false)
    expect(collection.hasCase("case3")).toBe(false)
  })

})
