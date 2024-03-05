import { destroy, isAlive, types } from "mobx-state-tree"
import { Attribute, IAttribute } from "./attribute"
import { CollectionModel, CollectionPropsModel, ICollectionModel, isCollectionModel } from "./collection"

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
    const withName = CollectionPropsModel.create({ name: "name" })
    expect(withName.displayTitle).toBe("name")
    withName.setName("newName")
    expect(withName.displayTitle).toBe("newName")
    expect(isCollectionModel(withName)).toBe(false)

    const withNameAndTitle = CollectionPropsModel.create({ name: "name", title: "title" })
    expect(withNameAndTitle.displayTitle).toBe("title")
    withNameAndTitle.setTitle("newTitle")
    expect(withNameAndTitle.displayTitle).toBe("newTitle")
    expect(isCollectionModel(withNameAndTitle)).toBe(false)
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
    // removing a non-existent attribute is a no-op
    collection.removeAttribute("a")
    expect(collection.attributes.length).toBe(0)

    // MST auto-removes undefined safeReferences from arrays,
    // but we force an undefined reference for testing purposes
    collection.addAttribute(undefined as any as IAttribute)
    expect(collection.getAttribute("a")).toBeUndefined()
    expect(collection.getAttributeIndex("a")).toBe(-1)
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
    expect(collection.getAttributeIndex("a")).toBe(0)

    const attrB = Attribute.create({ id: "b", name: "b" })
    tree.addAttribute(attrB)
    collection.addAttribute(attrB, { before: "a" })
    expect(collection.attributes.length).toBe(2)
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

})
