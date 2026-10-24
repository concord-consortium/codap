import { act, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { ReactNode } from "react"
import { DocumentContainerContext } from "../../hooks/use-document-container-context"
import { TileModelContext } from "../../hooks/use-tile-model-context"
import { DataSet } from "../../models/data/data-set"
import { featureFlagManager } from "../../models/feature-flags/feature-flag-manager"
import { ITileModel } from "../../models/tiles/tile-model"
import { SliderAttributeMenu } from "./slider-attribute-menu"
import { addDataSetCopy, setupSliderAndData } from "./slider-test-utils"

jest.mock("../../hooks/use-menu-height-adjustment", () => ({
  useMenuHeightAdjustment: () => undefined
}))

// The test dataset's numeric a3 and a4 are in its "collection3"; its other collections have only categorical
// attributes. A second dataset adds a date attribute, so the menu offers two collections, each as a submenu.
async function setupSliderAndTwoDataSets() {
  const result = await setupSliderAndData()
  const source = DataSet.create({ name: "events", collections: [{ name: "Events" }] })
  source.addAttribute({ name: "what" })
  source.addAttribute({ name: "when", userType: "date" })
  source.addCases([{ what: "start", when: "2020-01-01" }, { what: "end", when: "2020-01-11" }],
                  { canonicalize: true })
  const events = addDataSetCopy(result.content, source)
  return { ...result, events }
}

// the menu portals into the document container
function renderMenu(tile: ITileModel, trigger: ReactNode = "prompt") {
  const containerRef = { current: document.body }
  return render(
    <DocumentContainerContext.Provider value={containerRef}>
      <TileModelContext.Provider value={tile}>
        <SliderAttributeMenu>{trigger}</SliderAttributeMenu>
      </TileModelContext.Provider>
    </DocumentContainerContext.Provider>
  )
}

describe("SliderAttributeMenu", () => {
  beforeEach(() => {
    featureFlagManager.setServerConfig({ visibilitySlider: "on", selectionSlider: "on" })
  })

  afterEach(() => {
    act(() => featureFlagManager.setServerConfig({}))
  })

  // Chakra leaves the open menu hidden in jsdom, where its transition never runs, and hidden items have no
  // accessible name, so items are found by their text
  async function openMenu() {
    await userEvent.click(screen.getByTestId("slider-attribute-menu-button"))
  }
  async function menuItemTexts() {
    return (await screen.findAllByRole("menuitem", { hidden: true })).map(item => item.textContent)
  }
  async function clickMenuItem(text: string) {
    const items = await screen.findAllByRole("menuitem", { hidden: true })
    const item = items.find(anItem => anItem.textContent === text)
    if (!item) throw new Error(`no menu item "${text}" in ${items.map(anItem => anItem.textContent)}`)
    await userEvent.click(item)
  }

  it("shows its trigger content", async () => {
    const { tile } = await setupSliderAndData()
    renderMenu(tile, "Drag an attribute or click here")
    expect(screen.getByTestId("slider-attribute-menu-button")).toHaveTextContent("Drag an attribute or click here")
  })

  it("offers only the numeric and date attributes of every dataset, by collection", async () => {
    const { tile } = await setupSliderAndTwoDataSets()
    renderMenu(tile)
    await openMenu()
    expect(await menuItemTexts()).toEqual(["collection3", "Events"])
    await clickMenuItem("collection3")
    expect((await menuItemTexts()).sort()).toEqual(["Events", "a3", "a4", "collection3"])
    await clickMenuItem("Events")
    expect((await menuItemTexts()).sort()).toEqual(["Events", "collection3", "when"])
  })

  it("lists the attributes directly when only one collection has any to offer", async () => {
    const { tile } = await setupSliderAndData()
    renderMenu(tile)
    await openMenu()
    expect(await menuItemTexts()).toEqual(["a3", "a4"])
  })

  it("configures the slider from the chosen attribute", async () => {
    const { tile, events, slider } = await setupSliderAndTwoDataSets()
    slider.setSliderType("visibility")
    renderMenu(tile)
    await openMenu()
    await clickMenuItem("Events")
    await clickMenuItem("when")
    expect(slider.attributeId).toBe(events.attrFromName("when")!.id)
    expect(slider.dataSetId).toBe(events.id)
    expect(slider.sliderType).toBe("visibility")
    expect(slider.scaleType).toBe("date")
  })

  it("closes once an attribute is chosen from a collection's submenu", async () => {
    const { tile } = await setupSliderAndTwoDataSets()
    renderMenu(tile)
    await openMenu()
    await clickMenuItem("collection3")
    await clickMenuItem("a3")
    expect(screen.getByTestId("slider-attribute-menu-button")).toHaveAttribute("aria-expanded", "false")
  })

  it("switches a configured slider to another attribute", async () => {
    const { tile, dataSet, slider } = await setupSliderAndTwoDataSets()
    slider.setSliderType("selection")
    renderMenu(tile)
    await openMenu()
    await clickMenuItem("collection3")
    await clickMenuItem("a3")
    await openMenu()
    await clickMenuItem("collection3")
    await clickMenuItem("a4")
    const a4 = dataSet.attrFromName("a4")!
    expect(slider.attributeId).toBe(a4.id)
    expect(slider.axis.domain).toEqual([-6, -1])
    expect(slider.sliderType).toBe("selection")
  })
})
