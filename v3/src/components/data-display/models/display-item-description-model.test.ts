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

  it("stores the default as absence, so an unused document does not gain the field", () => {
    /*
     * V3 saves the serialized snapshot, so a materialized default would mean that merely opening
     * and saving a document that never used shapes changes it. Asserted against the JSON rather
     * than the snapshot object: `maybe` leaves the key present with an undefined value in memory,
     * and it is stringify dropping it that keeps the saved document unchanged.
     */
    const description = DisplayItemDescriptionModel.create()
    const serialized = JSON.parse(JSON.stringify(getSnapshot(description)))
    expect(serialized).not.toHaveProperty("_itemShape")
    expect(description.pointShape).toBe("circle")
  })

  it("removes the stored shape when it is set back to the default", () => {
    const description = DisplayItemDescriptionModel.create()
    description.setPointShape("star")
    expect(getSnapshot(description)._itemShape).toBe("star")

    description.setPointShape("circle")
    expect(JSON.parse(JSON.stringify(getSnapshot(description)))).not.toHaveProperty("_itemShape")
    expect(description.pointShape).toBe("circle")
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

  it("reports a polygon by its negative point size", () => {
    /*
     * A polygon layer has no point to size, so it sets a negative size to say so, and the inspector
     * reads that to hide the controls a polygon cannot use. Named here rather than compared at each
     * of those, which is how one of them came to offer a shape a polygon could not take.
     */
    const description = DisplayItemDescriptionModel.create()
    expect(description.isPolygon).toBe(false)

    description.setPointSizeMultiplier(-1)
    expect(description.isPolygon).toBe(true)

    description.setPointSizeMultiplier(1)
    expect(description.isPolygon).toBe(false)
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
