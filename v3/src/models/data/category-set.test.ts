import { types } from "mobx-state-tree"
import { kellyColors } from "../../utilities/color-utils"
import { Attribute, IAttribute } from "./attribute"
import { CategorySet } from "./category-set"

describe("CategorySet", () => {
  const Tree = types.model("Tree", {
    attribute: Attribute,
    categories: CategorySet
  })
  .actions(self => ({
    setAttribute(attr: IAttribute) {
      self.attribute = attr
    }
  }))

  it("constructs categories, allows them to be moved, and responds to changes", () => {
    const a = Attribute.create({ name: "a", values: ["a", "b", "c", "a", "b", "c"] })
    expect(a.strValues).toEqual(["a", "b", "c", "a", "b", "c"])
    const tree = Tree.create({
      attribute: a,
      categories: { attribute: a.id }
    })
    const categories = tree.categories
    const catKellyColors = () => categories.values.map(cat => categories.colorForCategory(cat))
    const numKellyColors = (n: number) => kellyColors.slice(0, n)
    expect(categories).toBeDefined()
    expect(categories.values).toEqual(["a", "b", "c"])
    expect(categories.index("foo")).toBeUndefined()
    expect(categories.colorForCategory("foo")).toBeUndefined()
    expect(catKellyColors()).toEqual(numKellyColors(3))
    categories.move("c", "b") // ["a", "c", "b"]
    expect(categories.lastMove)
      .toEqual({ value: "c", fromIndex: 2, toIndex: 1, length: 3, after: "a", before: "b" })
    expect(categories.values).toEqual(["a", "c", "b"])
    expect(catKellyColors()).toEqual(numKellyColors(3))
    categories.move("b", "a") // ["b", "a", "c"]
    expect(categories.lastMove)
      .toEqual({ value: "b", fromIndex: 2, toIndex: 0, length: 3, after: undefined, before: "a" })
    expect(categories.values).toEqual(["b", "a", "c"])
    expect(catKellyColors()).toEqual(numKellyColors(3))
    categories.move("a") // ["b", "c", "a"]
    expect(categories.lastMove)
      .toEqual({ value: "a", fromIndex: 1, toIndex: 2, length: 3, after: "c", before: undefined })
    expect(categories.values).toEqual(["b", "c", "a"])
    expect(catKellyColors()).toEqual(numKellyColors(3))

    // remove "b", so the "natural" order is ["a", "c", "b"]
    a.removeValues(1, 1)
    expect(categories.values).toEqual(["b", "c", "a"])
    expect(catKellyColors()).toEqual(numKellyColors(3))
    // remove the other "b", so the "natural" order is ["a", "c"]
    a.removeValues(3, 1)
    expect(categories.values).toEqual(["c", "a"])
    expect(catKellyColors()).toEqual(numKellyColors(2))
    // remove a's so the only category is "c"
    a.removeValues(2, 1)
    a.removeValues(0, 1)
    expect(categories.values).toEqual(["c"])
    expect(catKellyColors()).toEqual(numKellyColors(1))

    // can't move a non-existent value
    categories.move("b", "a")
    expect(categories.moves.length).toBe(3)
    expect(categories.values).toEqual(["c"])
    expect(catKellyColors()).toEqual(numKellyColors(1))

    // add values so the "natural" order is ["a", "x", "y", "z", "b", "c"]
    a.addValues(["a", "x", "y", "z", "b"], 0)
    expect(categories.values).toEqual(["b", "c", "a", "x", "y", "z"])
    expect(catKellyColors()).toEqual(numKellyColors(6))

    // specifying a bogus before value moves category to end
    categories.move("c", "bogus")
    expect(categories.values).toEqual(["b", "a", "x", "y", "z", "c"])
    expect(catKellyColors()).toEqual(numKellyColors(6))

    // moving to a position near the end works even if other values near the end are removed
    categories.move("b", "c")
    expect(categories.values).toEqual(["a", "x", "y", "z", "b", "c"])
    expect(catKellyColors()).toEqual(numKellyColors(6))
    // remove "c"s
    a.removeValues(5, 2)
    expect(categories.values).toEqual(["a", "x", "y", "z", "b"])
    expect(catKellyColors()).toEqual(numKellyColors(5))
    categories.move("z", "a")
    expect(categories.values).toEqual(["z", "a", "x", "y", "b"])
    expect(catKellyColors()).toEqual(numKellyColors(5))
    // remove "a"
    a.removeValues(0, 1)
    expect(categories.values).toEqual(["z", "x", "y", "b"])
    expect(catKellyColors()).toEqual(numKellyColors(4))
    categories.setColorForCategory("b", "red")
    expect(catKellyColors()).toEqual([...numKellyColors(3), "red"])
    // moving "b" before "z" combines moves
    const originalFromIndex = categories.lastMove?.fromIndex
    expect(categories.moves.length).toBe(6)
    categories.move("z", "b")
    expect(categories.values).toEqual(["x", "y", "z", "b"])
    expect(categories.moves.length).toBe(6)
    expect(categories.lastMove?.fromIndex).toBe(originalFromIndex)
  })

  it("supports callback on invalidation of attribute", () => {
    const handleAttributeInvalidated = jest.fn()

    // can destroy attribute without having set an invalidation handler
    const a = Attribute.create({ name: "a" })
    const aTree = Tree.create({ attribute: a, categories: { attribute: a.id } })
    aTree.setAttribute(Attribute.create({ name: "b" }))
    expect(handleAttributeInvalidated).not.toHaveBeenCalled()

    // handler is called on attribute destruction if one has been specified
    const c = Attribute.create({ name: "c" })
    const cId = c.id
    const cTree = Tree.create({ attribute: c, categories: { attribute: cId } })
    cTree.categories.onAttributeInvalidated((attrId: string) => handleAttributeInvalidated(attrId))
    cTree.setAttribute(Attribute.create({ name: "d" }))
    expect(handleAttributeInvalidated).toHaveBeenCalledTimes(1)
    expect(handleAttributeInvalidated).toHaveBeenCalledWith(cId)
  })
})
