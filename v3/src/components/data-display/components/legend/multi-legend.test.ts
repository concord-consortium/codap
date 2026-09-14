import { IBaseLayerModel } from "../../models/base-data-display-content-model"
import { layerHasLegendToShow } from "./multi-legend"

const layer = (
  { legendID = "", inoperable = false, isVisible = true } = {}
) => ({
  id: "layer-1",
  layerIndex: 0,
  isVisible,
  dataConfiguration: {
    attributeID: () => legendID,
    legendAttributeIsInoperable: inoperable
  }
} as unknown as IBaseLayerModel)

describe("layerHasLegendToShow", () => {
  it("shows a layer with a legend attribute", () => {
    expect(layerHasLegendToShow(layer({ legendID: "legId" }))).toBe(true)
  })

  it("skips a layer with no legend attribute", () => {
    expect(layerHasLegendToShow(layer())).toBe(false)
  })

  it("skips a hidden layer", () => {
    expect(layerHasLegendToShow(layer({ legendID: "legId", isVisible: false }))).toBe(false)
  })

  it("shows a layer whose legend attribute cannot be honored", () => {
    /*
     * The base configuration reports "" for an assignment it cannot honor, so this layer would
     * otherwise be dropped here -- before Legend could render the label, the remove action, and the
     * message explaining why the points are not colored by it.
     */
    expect(layerHasLegendToShow(layer({ inoperable: true }))).toBe(true)
  })

  it("still skips that layer when it is hidden", () => {
    expect(layerHasLegendToShow(layer({ inoperable: true, isVisible: false }))).toBe(false)
  })
})
