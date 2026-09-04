import { applySnapshot, getSnapshot } from "mobx-state-tree"
import { DisplayItemDescriptionModel } from "./display-item-description-model"

describe("DisplayItemDescriptionModel point shape", () => {
  it("defaults to circle, so existing documents render unchanged", () => {
    const description = DisplayItemDescriptionModel.create()
    expect(description.pointShape).toBe("circle")
    expect(description.itemShape).toBe("circle")
  })

  it("stores an assigned shape", () => {
    const description = DisplayItemDescriptionModel.create()
    description.setPointShape("triangle")
    expect(description.pointShape).toBe("triangle")
  })

  it("persists the shape in the snapshot", () => {
    const description = DisplayItemDescriptionModel.create()
    description.setPointShape("plus")
    expect(getSnapshot(description)._itemShape).toBe("plus")

    const restored = DisplayItemDescriptionModel.create(getSnapshot(description))
    expect(restored.pointShape).toBe("plus")
  })

  it("resolves a shape it does not recognize to the default", () => {
    const description = DisplayItemDescriptionModel.create()
    // simulates a document written by a build that knows a shape this one does not
    applySnapshot(description, { ...getSnapshot(description), _itemShape: "hexagon" })
    expect(description.pointShape).toBe("circle")
  })

  it("is independent of point color", () => {
    // shape is a second encoding channel, so setting one must not disturb the other
    const description = DisplayItemDescriptionModel.create()
    const originalColor = description.pointColor
    description.setPointShape("star")
    expect(description.pointColor).toBe(originalColor)

    description.setPointColor("#123456")
    expect(description.pointShape).toBe("star")
  })
})
