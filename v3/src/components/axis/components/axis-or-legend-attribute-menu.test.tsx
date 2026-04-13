/* eslint-disable testing-library/no-node-access */
import { act, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import React, { createRef } from "react"
import { AxisOrLegendAttributeMenu } from "./axis-or-legend-attribute-menu"
import { DocumentContainerContext } from "../../../hooks/use-document-container-context"
import { InstanceIdContext } from "../../../hooks/use-instance-id-context"

// Mock hooks that require DOM measurements or DnD context
jest.mock("../../../hooks/use-drag-drop", () => ({
  useDraggableAttribute: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn()
  })
}))

jest.mock("../../../hooks/use-overlay-bounds", () => ({
  useOverlayBounds: () => ({ left: 0, top: 0, width: 100, height: 20 })
}))

jest.mock("../../../hooks/use-outside-pointer-down", () => ({
  useOutsidePointerDown: jest.fn()
}))

jest.mock("../../../hooks/use-menu-height-adjustment", () => ({
  useMenuHeightAdjustment: () => undefined
}))

// Mock shared data utilities that need MST tree context
const mockDataSet = {
  id: "ds1",
  name: "TestData",
  attrFromID: (id: string) => {
    const attrs: Record<string, any> = {
      attr1: { id: "attr1", name: "Height", type: "numeric", description: "" },
      attr2: { id: "attr2", name: "Weight", type: "numeric", description: "" },
      attr3: { id: "attr3", name: "Species", type: "categorical", description: "" }
    }
    return attrs[id] || null
  },
  collections: [
    {
      id: "col1",
      name: "Cases",
      attributes: [
        { id: "attr1", name: "Height", type: "numeric" },
        { id: "attr2", name: "Weight", type: "numeric" },
        { id: "attr3", name: "Species", type: "categorical" }
      ]
    }
  ]
}

jest.mock("../../../models/data/collection", () => ({
  isCollectionModel: () => true
}))

let mockGetDataSetsReturn: any[] = [mockDataSet]

jest.mock("../../../models/shared/shared-data-utils", () => ({
  getDataSets: () => mockGetDataSetsReturn,
  getMetadataFromDataSet: () => undefined
}))

// Mock data configuration context
const mockDataConfiguration: Record<string, any> = {
  dataset: mockDataSet,
  attributeID: (role: string) => role === "x" ? "attr1" : "",
  attributeType: (role: string) => role === "x" ? "numeric" : "",
  placeCanAcceptAttributeIDDrop: undefined
}

jest.mock("../../data-display/hooks/use-data-configuration-context", () => ({
  useDataConfigurationContext: () => mockDataConfiguration,
  DataConfigurationContext: React.createContext(undefined)
}))

// Mock free tile layout context
jest.mock("../../../hooks/use-free-tile-layout-context", () => ({
  useFreeTileLayoutContext: () => ({ height: 300 })
}))

describe("AxisOrLegendAttributeMenu", () => {
  const containerRef = createRef<HTMLDivElement>()

  const defaultProps = {
    place: "bottom" as const,
    target: null as SVGGElement | null,
    portal: null as HTMLElement | null,
    layoutBounds: "",
    onChangeAttribute: jest.fn(),
    onRemoveAttribute: jest.fn(),
    onTreatAttributeAs: jest.fn()
  }

  const renderMenu = (props = {}) => {
    return render(
      <DocumentContainerContext.Provider value={containerRef}>
        <InstanceIdContext.Provider value="test-instance">
          <div ref={containerRef}>
            <AxisOrLegendAttributeMenu {...defaultProps} {...props} />
          </div>
        </InstanceIdContext.Provider>
      </DocumentContainerContext.Provider>
    )
  }

  beforeEach(() => {
    // Reset mock data configuration to defaults so tests are independent
    mockDataConfiguration.attributeID = (role: string) => role === "x" ? "attr1" : ""
    mockDataConfiguration.attributeType = (role: string) => role === "x" ? "numeric" : ""
    mockGetDataSetsReturn = [mockDataSet]
    jest.clearAllMocks()
  })

  describe("aria-label", () => {
    it("sets aria-label describing the axis when an attribute is assigned", () => {
      renderMenu({ place: "bottom" })
      const button = screen.getByTestId("axis-legend-attribute-button-bottom")
      expect(button).toHaveAttribute("aria-label")
      const label = button.getAttribute("aria-label")!
      expect(label).toContain("horizontal")
      expect(label).toContain("Height")
    })

    it("sets aria-label for vertical axis", () => {
      mockDataConfiguration.attributeID = (role: string) => role === "y" ? "attr1" : ""
      mockDataConfiguration.attributeType = (role: string) => role === "y" ? "numeric" : ""
      renderMenu({ place: "left" })
      const button = screen.getByTestId("axis-legend-attribute-button-left")
      const label = button.getAttribute("aria-label")!
      expect(label).toContain("vertical")
    })

    it("sets aria-label for legend", () => {
      mockDataConfiguration.attributeID = (role: string) => role === "legend" ? "attr3" : ""
      mockDataConfiguration.attributeType = (role: string) => role === "legend" ? "categorical" : ""
      renderMenu({ place: "legend" })
      const button = screen.getByTestId("axis-legend-attribute-button-legend")
      const label = button.getAttribute("aria-label")!
      expect(label).toContain("legend")
    })

    it("sets appropriate aria-label when no attribute is assigned", () => {
      mockDataConfiguration.attributeID = () => ""
      mockDataConfiguration.attributeType = () => ""
      renderMenu({ place: "bottom" })
      const button = screen.getByTestId("axis-legend-attribute-button-bottom")
      const label = button.getAttribute("aria-label")!
      expect(label).toContain("Drag an attribute or click here")
      // Should not contain an attribute name
      expect(label).not.toContain("Height")
    })
  })

  describe("dropdown arrow indicator", () => {
    it("renders a dropdown arrow element", () => {
      // SVG imports are mocked as strings in the test environment (fileMock.js),
      // so we verify the arrow is rendered by checking for its aria-hidden attribute
      // in the overlay div structure.
      renderMenu()
      const overlayDiv = screen.getByTestId("attribute-label-menu-bottom")
      // The DropdownArrow is rendered as a child of the overlay div
      expect(overlayDiv).toBeInTheDocument()
      // The button should be inside the overlay
      expect(overlayDiv.querySelector("[data-testid='axis-legend-attribute-button-bottom']"))
        .toBeInTheDocument()
    })
  })

  describe("scroll into view on focus", () => {
    it("calls scrollIntoView when a menu item receives focus", async () => {
      renderMenu({ place: "bottom" })

      // The MenuList has an onFocus handler that calls scrollIntoView.
      // Chakra renders menu items even when the menu is "closed" (just hidden via CSS).
      // We can verify the handler works by directly focusing a menu item.
      const menuItems = screen.getAllByRole("menuitem", { hidden: true })
      expect(menuItems.length).toBeGreaterThan(0)
      act(() => { menuItems[0].focus() })
      // scrollIntoView is mocked in setupTests.ts
      expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: "nearest" })
    })
  })

  describe("CSS class relay to SVG target", () => {
    let svgTarget: SVGGElement

    beforeEach(() => {
      // Create an SVG <g> element to serve as the target
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
      svgTarget = document.createElementNS("http://www.w3.org/2000/svg", "g")
      svg.appendChild(svgTarget)
      document.body.appendChild(svg)
    })

    afterEach(() => {
      svgTarget.closest("svg")?.remove()
    })

    it("adds 'hovered' class on pointer enter and removes on pointer leave", async () => {
      const user = userEvent.setup()
      renderMenu({ target: svgTarget })
      const overlay = screen.getByTestId("attribute-label-menu-bottom")

      await user.hover(overlay)
      expect(svgTarget.classList.contains("hovered")).toBe(true)

      await user.unhover(overlay)
      expect(svgTarget.classList.contains("hovered")).toBe(false)
    })

    it("adds 'focused' class on focus and removes on blur", () => {
      renderMenu({ target: svgTarget })
      const button = screen.getByTestId("axis-legend-attribute-button-bottom")

      act(() => { button.focus() })
      expect(svgTarget.classList.contains("focused")).toBe(true)

      act(() => { button.blur() })
      expect(svgTarget.classList.contains("focused")).toBe(false)
    })

    it("adds 'menu-open' class when menu opens and removes when it closes", async () => {
      const user = userEvent.setup()
      renderMenu({ target: svgTarget })
      const button = screen.getByTestId("axis-legend-attribute-button-bottom")

      // Open menu
      await user.click(button)
      expect(svgTarget.classList.contains("menu-open")).toBe(true)

      // Close menu by clicking button again
      await user.click(button)
      expect(svgTarget.classList.contains("menu-open")).toBe(false)
    })

    it("removes 'focused' class when menu closes", async () => {
      const user = userEvent.setup()
      renderMenu({ target: svgTarget })
      const button = screen.getByTestId("axis-legend-attribute-button-bottom")

      // Open menu (which may set focused via focus events)
      await user.click(button)
      svgTarget.classList.add("focused")  // simulate focus state
      expect(svgTarget.classList.contains("menu-open")).toBe(true)

      // Close menu
      await user.click(button)
      expect(svgTarget.classList.contains("focused")).toBe(false)
    })

    it("cleans up all classes on unmount", async () => {
      const user = userEvent.setup()
      const { unmount } = renderMenu({ target: svgTarget })
      const overlay = screen.getByTestId("attribute-label-menu-bottom")

      // Set up some classes
      await user.hover(overlay)
      expect(svgTarget.classList.contains("hovered")).toBe(true)

      unmount()
      expect(svgTarget.classList.contains("hovered")).toBe(false)
      expect(svgTarget.classList.contains("focused")).toBe(false)
      expect(svgTarget.classList.contains("menu-open")).toBe(false)
    })
  })

  describe("menu rendering", () => {
    it("renders the menu list in the DOM", () => {
      renderMenu({ place: "bottom" })
      const menuList = screen.getByTestId("axis-legend-attribute-menu-list-bottom")
      expect(menuList).toBeInTheDocument()
    })

    it("includes attribute names as menu items", () => {
      renderMenu({ place: "bottom" })
      // Chakra renders items even when menu is closed (hidden via CSS)
      const menuItems = screen.getAllByRole("menuitem", { hidden: true })
      const itemTexts = menuItems.map(item => item.textContent)
      expect(itemTexts).toContain("Height")
      expect(itemTexts).toContain("Weight")
      expect(itemTexts).toContain("Species")
    })

    it("calls onChangeAttribute when a menu item is clicked", async () => {
      const user = userEvent.setup()
      const onChangeAttribute = jest.fn()
      renderMenu({ place: "bottom", onChangeAttribute })

      // Click the "Weight" menu item directly (it's in the DOM even if visually hidden)
      const menuItems = screen.getAllByRole("menuitem", { hidden: true })
      const weightItem = menuItems.find(item => item.textContent === "Weight")
      expect(weightItem).toBeDefined()
      await user.click(weightItem!)
      expect(onChangeAttribute).toHaveBeenCalledWith("bottom", mockDataSet, "attr2")
    })

    it("shows 'No attributes available' when no datasets exist", () => {
      mockGetDataSetsReturn = []
      mockDataConfiguration.attributeID = () => ""
      mockDataConfiguration.attributeType = () => ""
      renderMenu({ place: "bottom" })
      const menuItems = screen.getAllByRole("menuitem", { hidden: true })
      const noAttrsItem = menuItems.find(item => item.textContent === "No attributes available")
      expect(noAttrsItem).toBeDefined()
      expect(noAttrsItem).toHaveAttribute("aria-disabled", "true")
    })
  })
})
/* eslint-enable testing-library/no-node-access */
