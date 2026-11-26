import { appState } from "../../models/app-state"
import { serializeCodapV2Document } from "../../models/document/serialize-document"
import { getTitle } from "../../models/tiles/tile-content-info"
import { configureSliderFromAttribute } from "./slider-attribute-drop"
import { isSliderModel } from "./slider-model"
import { setupSliderAndData } from "./slider-test-utils"

describe("slider title", () => {
  it("is the variable name for a variable slider", async () => {
    const { tile, slider } = await setupSliderAndData()
    expect(getTitle(tile)).toBe(slider.name)
  })

  it("names the type of a range slider with no attribute", async () => {
    const { tile, slider } = await setupSliderAndData()
    slider.setSliderType("visibility")
    expect(getTitle(tile)).toBe("Visibility Slider")
    slider.setSliderType("selection")
    expect(getTitle(tile)).toBe("Selection Slider")
  })

  it("is the collection's title once an attribute is bound", async () => {
    const { tile, dataSet, slider } = await setupSliderAndData()
    slider.setSliderType("visibility")
    configureSliderFromAttribute(tile, dataSet, dataSet.attrFromName("a3")!.id)
    expect(getTitle(tile)).toBe(dataSet.childCollection.title)
  })

  it("names the type again when the bound attribute is deleted", async () => {
    const { tile, dataSet, slider } = await setupSliderAndData()
    const a3 = dataSet.attrFromName("a3")!
    configureSliderFromAttribute(tile, dataSet, a3.id)
    dataSet.removeAttribute(a3.id)
    expect(slider.attribute).toBeUndefined()
    expect(getTitle(tile)).toBe("Visibility Slider")
  })

  it("keeps a title the user set", async () => {
    const { tile, slider } = await setupSliderAndData()
    tile.setUserTitle("My range")
    slider.setSliderType("visibility")
    expect(getTitle(tile)).toBe("My range")
  })

  it("shows a title a plugin set on an empty range slider", async () => {
    const { tile, slider } = await setupSliderAndData()
    slider.setSliderType("visibility")
    // the plugin API sets a title without marking it as the user's
    tile.setTitle("From a plugin")
    expect(getTitle(tile)).toBe("From a plugin")
  })

  it("names the type of an empty range slider after a V2 save and reload", async () => {
    const { slider } = await setupSliderAndData()
    slider.setSliderType("selection")
    await appState.setDocument(await serializeCodapV2Document(appState.document))
    const restoredTile = Array.from(appState.document.content!.tileMap.values())
      .find(aTile => isSliderModel(aTile.content))!
    expect(getTitle(restoredTile)).toBe("Selection Slider")
  })
})

