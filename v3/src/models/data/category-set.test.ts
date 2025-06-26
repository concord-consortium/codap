import { applySnapshot, getSnapshot, types } from "mobx-state-tree"
import { kellyColors } from "../../utilities/color-utils"
import { Attribute, IAttribute } from "./attribute"
import { CategorySet, ICategorySet, createProvisionalCategorySet, getProvisionalDataSet } from "./category-set"
import { DataSet } from "./data-set"
import { onAnyAction } from "../../utilities/mst-utils"

describe("CategorySet", () => {
  const Tree = types.model("Tree", {
    attribute: Attribute,
    categories: CategorySet
  })
  .actions(self => ({
    setAttribute(attr: IAttribute) {
      self.attribute = attr
    },
    setCategorySet(categorySet: ICategorySet) {
      applySnapshot(self.categories, getSnapshot(categorySet))
    },
    setCategorySetAttribute(attribute: IAttribute) {
      self.categories.attribute = attribute
    }
  }))

  it("constructs provisional CategorySets", () => {
    const data = DataSet.create()
    data.addAttribute({ id: "aId", name: "aFree" })
    // create a provisional CategorySet
    const categories = createProvisionalCategorySet(data, "aId")
    expect(getProvisionalDataSet(categories)).toBe(data)
    // attribute reference resolves to the free attribute
    expect(categories.attribute.name).toBe("aFree")

    // attribute changes trigger invalidation for provisional category sets
    const provisionalSpy = jest.spyOn(categories, "invalidate")
    data.attributes[0].clearFormula()
    expect(provisionalSpy).toHaveBeenCalledTimes(1)
    provisionalSpy.mockRestore()

    const tree = Tree.create({
      attribute: Attribute.create({ id: "aId", name: "aTree" }),
      categories: { attribute: "aId" }
    })
    // assign the free CategorySet to the tree
    tree.setCategorySet(categories)
    // attribute reference resolves to attribute in tree
    expect(tree.categories.attribute.name).toBe("aTree")

    // attribute changes trigger invalidation for attached category sets
    const attachedSpy = jest.spyOn(tree.categories, "invalidate")
    tree.attribute.clearFormula()
    expect(attachedSpy).toHaveBeenCalledTimes(1)
    attachedSpy.mockRestore()

    // assigning a new attribute sets the attribute id
    tree.setAttribute(Attribute.create({ id: "bId", name: "bTree" }))
    tree.setCategorySetAttribute(tree.attribute)
    expect(tree.categories.attribute.id).toBe("bId")

    // getProvisionalDataSet returns undefined for simple attributes and null
    const c = Attribute.create({ id: "cId", name: "c" }, undefined)
    expect(getProvisionalDataSet(c)).toBeUndefined()
    expect(getProvisionalDataSet(null)).toBeUndefined()
  })

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
    expect(categories.valuesArray).toEqual(["a", "b", "c"])
    expect(categories.index("foo")).toBeUndefined()
    expect(categories.colorForCategory("foo")).toBeUndefined()
    expect(catKellyColors()).toEqual(numKellyColors(3))
    categories.move("c", "b") // ["a", "c", "b"]
    expect(categories.lastMove)
      .toEqual({ value: "c", fromIndex: 2, toIndex: 1, length: 3, after: "a", before: "b" })
    expect(categories.values).toEqual(["a", "c", "b"])
    expect(categories.valuesArray).toEqual(["a", "c", "b"])
    expect(catKellyColors()).toEqual(numKellyColors(3))
    categories.move("b", "a") // ["b", "a", "c"]
    expect(categories.lastMove)
      .toEqual({ value: "b", fromIndex: 2, toIndex: 0, length: 3, after: undefined, before: "a" })
    expect(categories.values).toEqual(["b", "a", "c"])
    expect(categories.valuesArray).toEqual(["b", "a", "c"])
    expect(catKellyColors()).toEqual(numKellyColors(3))
    categories.move("a") // ["b", "c", "a"]
    expect(categories.lastMove)
      .toEqual({ value: "a", fromIndex: 1, toIndex: 2, length: 3, after: "c", before: undefined })
    expect(categories.values).toEqual(["b", "c", "a"])
    expect(categories.valuesArray).toEqual(["b", "c", "a"])
    expect(catKellyColors()).toEqual(numKellyColors(3))

    // remove "b", so the "natural" order is ["a", "c", "b"]
    a.removeValues(1, 1)
    expect(categories.values).toEqual(["b", "c", "a"])
    expect(categories.valuesArray).toEqual(["b", "c", "a"])
    expect(catKellyColors()).toEqual(numKellyColors(3))
    // remove the other "b", so the "natural" order is ["a", "c"]
    a.removeValues(3, 1)
    expect(categories.values).toEqual(["c", "a"])
    expect(categories.valuesArray).toEqual(["c", "a"])
    expect(catKellyColors()).toEqual(numKellyColors(2))
    // remove a's so the only category is "c"
    a.removeValues(2, 1)
    a.removeValues(0, 1)
    expect(categories.values).toEqual(["c"])
    expect(categories.valuesArray).toEqual(["c"])
    expect(catKellyColors()).toEqual(numKellyColors(1))

    // can't move a non-existent value
    categories.move("b", "a")
    expect(categories.moves.length).toBe(3)
    expect(categories.values).toEqual(["c"])
    expect(categories.valuesArray).toEqual(["c"])
    expect(catKellyColors()).toEqual(numKellyColors(1))

    // add values so the "natural" order is ["a", "x", "y", "z", "b", "c"]
    a.addValues(["a", "x", "y", "z", "b"], 0)
    expect(categories.values).toEqual(["b", "c", "a", "x", "y", "z"])
    expect(categories.valuesArray).toEqual(["b", "c", "a", "x", "y", "z"])
    expect(catKellyColors()).toEqual(numKellyColors(6))

    // specifying a bogus before value moves category to end
    categories.move("c", "bogus")
    expect(categories.values).toEqual(["b", "a", "x", "y", "z", "c"])
    expect(categories.valuesArray).toEqual(["b", "a", "x", "y", "z", "c"])
    expect(catKellyColors()).toEqual(numKellyColors(6))

    // moving to a position near the end works even if other values near the end are removed
    categories.move("b", "c")
    expect(categories.values).toEqual(["a", "x", "y", "z", "b", "c"])
    expect(categories.valuesArray).toEqual(["a", "x", "y", "z", "b", "c"])
    expect(catKellyColors()).toEqual(numKellyColors(6))
    // remove "c"s
    a.removeValues(5, 2)
    expect(categories.values).toEqual(["a", "x", "y", "z", "b"])
    expect(categories.valuesArray).toEqual(["a", "x", "y", "z", "b"])
    expect(catKellyColors()).toEqual(numKellyColors(5))
    categories.move("z", "a")
    expect(categories.values).toEqual(["z", "a", "x", "y", "b"])
    expect(categories.valuesArray).toEqual(["z", "a", "x", "y", "b"])
    expect(catKellyColors()).toEqual(numKellyColors(5))
    // remove "a"
    a.removeValues(0, 1)
    expect(categories.values).toEqual(["z", "x", "y", "b"])
    expect(categories.valuesArray).toEqual(["z", "x", "y", "b"])
    expect(catKellyColors()).toEqual(numKellyColors(4))
    categories.setColorForCategory("b", "red")
    expect(catKellyColors()).toEqual([...numKellyColors(3), "red"])
    categories.setColorForCategory("b", "")
    expect(catKellyColors()).toEqual(numKellyColors(4))
    // moving "b" before "z" combines moves
    const originalFromIndex = categories.lastMove?.fromIndex
    expect(categories.moves.length).toBe(6)
    categories.move("z", "b")
    expect(categories.values).toEqual(["x", "y", "z", "b"])
    expect(categories.valuesArray).toEqual(["x", "y", "z", "b"])
    expect(categories.moves.length).toBe(6)
    expect(categories.lastMove?.fromIndex).toBe(originalFromIndex)
  })

  it("handles volatile category drags", () => {
    const a = Attribute.create({ name: "a", values: ["a", "b", "c", "a", "b", "c"] })
    expect(a.strValues).toEqual(["a", "b", "c", "a", "b", "c"])
    const tree = Tree.create({
      attribute: a,
      categories: { attribute: a.id }
    })
    const categories = tree.categories
    categories.setDragCategory("a", 2)
    expect(categories.values).toEqual(["b", "c", "a"])
    categories.setDragCategory()
    expect(categories.values).toEqual(["a", "b", "c"])
  })

  it("tracks user color assignments", () => {
    const a = Attribute.create({ name: "a", values: ["a", "b", "c"] })
    const tree = Tree.create({
      attribute: a,
      categories: { attribute: a.id }
    })
    const categories = tree.categories
    expect(categories.values).toEqual(["a", "b", "c"])
    expect(categories.colors.size).toBe(0)
    categories.setColorForCategory("a", "red")
    expect(categories.colors.size).toBe(1)
    expect(categories.colorForCategory("a")).toBe("red")
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

  it("identifies actions that indicate user modification of category sets", () => {
    const a = Attribute.create({ name: "a", values: ["a", "b", "c"] })
    const tree = Tree.create({ attribute: a, categories: { attribute: a.id } })

    const fn = jest.fn()
    const disposer = onAnyAction(tree.categories, action => {
      if (tree.categories.userActionNames.includes(action.name)) {
        fn()
      }
    })
    tree.categories.move("c", "a")
    expect(fn).toHaveBeenCalledTimes(1)
    tree.categories.setColorForCategory("a", "red")
    expect(fn).toHaveBeenCalledTimes(2)
    expect(tree.categories.colorForCategory("a")).toBe("red")
    expect(fn).toHaveBeenCalledTimes(2)
    tree.categories.storeAllCurrentColors()
    expect(fn).toHaveBeenCalledTimes(4)

    disposer()
  })
})
