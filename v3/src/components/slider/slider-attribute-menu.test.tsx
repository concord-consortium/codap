import { act, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { ReactNode } from "react"
import { DocumentContainerContext } from "../../hooks/use-document-container-context"
import { featureFlagManager } from "../../models/feature-flags/feature-flag-manager"
import { ITileModel } from "../../models/tiles/tile-model"
import { SliderAttributeMenu } from "./slider-attribute-menu"
import { setupSliderAndData } from "./slider-test-utils"

jest.mock("../../hooks/use-menu-height-adjustment", () => ({
  useMenuHeightAdjustment: () => undefined
}))

// the menu portals into the document container
function renderMenu(tile: ITileModel, trigger: ReactNode = "prompt") {
  const containerRef = { current: document.body }
  return render(
    <DocumentContainerContext.Provider value={containerRef}>
      <SliderAttributeMenu tile={tile}>{trigger}</SliderAttributeMenu>
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

  it("offers only the numeric and date attributes, by collection", async () => {
    const { tile } = await setupSliderAndData()
    renderMenu(tile)
    await openMenu()
    // the test dataset's categorical a1 is in its first collection; its numeric a3 and a4 are in its third
    await clickMenuItem("collection1")
    expect(await menuItemTexts()).not.toContain("a1")
    await clickMenuItem("collection3")
    const names = await menuItemTexts()
    expect(names).toContain("a3")
    expect(names).toContain("a4")
  })

  it("configures the slider from the chosen attribute", async () => {
    const { tile, dataSet, slider } = await setupSliderAndData()
    slider.setSliderType("visibility")
    renderMenu(tile)
    await openMenu()
    await clickMenuItem("collection3")
    await clickMenuItem("a4")
    expect(slider.attributeId).toBe(dataSet.attrFromName("a4")!.id)
    expect(slider.dataSetId).toBe(dataSet.id)
    expect(slider.sliderType).toBe("visibility")
  })

  it("closes once an attribute is chosen from a collection's submenu", async () => {
    const { tile } = await setupSliderAndData()
    renderMenu(tile)
    await openMenu()
    await clickMenuItem("collection3")
    await clickMenuItem("a3")
    expect(screen.getByTestId("slider-attribute-menu-button")).toHaveAttribute("aria-expanded", "false")
  })

  it("switches a configured slider to another attribute", async () => {
    const { tile, dataSet, slider } = await setupSliderAndData()
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
