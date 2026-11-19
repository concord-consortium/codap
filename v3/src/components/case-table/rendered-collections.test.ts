import { DataSet } from "../../models/data/data-set"
import { getRenderedCollections } from "./rendered-collections"

describe("getRenderedCollections", () => {
  // three-level hierarchy: grandparent > parent > child, one attribute per collection
  const data = DataSet.create({
    name: "data",
    collections: [{ name: "grandparent" }, { name: "parent" }, { name: "child" }]
  })
  const [grandparent, parent, child] = data.collections
  const gAttr = data.addAttribute({ name: "g" }, { collection: grandparent.id })
  const pAttr = data.addAttribute({ name: "p" }, { collection: parent.id })
  const cAttr = data.addAttribute({ name: "c" }, { collection: child.id })

  const rendered = (...hiddenAttrs: string[]) => {
    const hidden = new Set(hiddenAttrs)
    return getRenderedCollections(data.collections, attrId => hidden.has(attrId)).map(c => c.name)
  }

  it("renders every collection when none has all of its attributes hidden", () => {
    expect(rendered()).toEqual(["grandparent", "parent", "child"])
  })

  it("omits a childmost collection whose attributes are all hidden", () => {
    expect(rendered(cAttr.id)).toEqual(["grandparent", "parent"])
  })

  it("omits a parentmost collection whose attributes are all hidden", () => {
    expect(rendered(gAttr.id)).toEqual(["parent", "child"])
  })

  it("omits any combination of collections whose attributes are all hidden", () => {
    expect(rendered(gAttr.id, cAttr.id)).toEqual(["parent"])
    expect(rendered(gAttr.id, pAttr.id)).toEqual(["child"])
    expect(rendered(pAttr.id, cAttr.id)).toEqual(["grandparent"])
  })

  it("omits a middle collection whose attributes are all hidden", () => {
    expect(rendered(pAttr.id)).toEqual(["grandparent", "child"])
  })

  it("renders only the childmost collection when every attribute is hidden", () => {
    expect(rendered(gAttr.id, pAttr.id, cAttr.id)).toEqual(["child"])
  })

  it("renders a flat collection whose attributes are all hidden", () => {
    const flat = DataSet.create({ name: "flat" })
    const attr = flat.addAttribute({ name: "a" })
    expect(getRenderedCollections(flat.collections, attrId => attrId === attr.id)).toEqual([flat.collections[0]])
  })

  it("renders nothing when there are no collections", () => {
    expect(getRenderedCollections([], () => false)).toEqual([])
  })
})
