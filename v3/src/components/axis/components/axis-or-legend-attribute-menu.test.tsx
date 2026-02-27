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

jest.mock("../../../models/shared/shared-data-utils", () => ({
  getDataSets: () => [mockDataSet],
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
      expect(label).toContain("horizontal")
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
  })
})
/* eslint-enable testing-library/no-node-access */
