import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { GraphMeasurePalette } from "./graph-measure-palette"
import { IGroupItem, IMeasureMenuItem } from "../../adornments/store/adornments-store-utils"

// Mock InspectorPalette to just render children
jest.mock("../../../inspector-panel", () => ({
  InspectorPalette: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="inspector-palette">{children}</div>
  )
}))

// Mock SVG icon
jest.mock("../../../../assets/icons/inspector-panel/data-icon.svg", () => "MeasureIcon")

// Mock translation to return the key
jest.mock("../../../../utilities/translation/translate", () => ({
  t: (key: string) => key,
  translate: (key: string) => key
}))

// Mock mst-utils
jest.mock("../../../../utilities/mst-utils", () => ({
  getDocumentContentPropertyFromNode: jest.fn(() => false),
  typeOptionalBoolean: jest.fn(() => ({}))
}))

// Mock the hooks that import heavy model dependencies
jest.mock("../../hooks/use-graph-content-model-context", () => ({
  GraphContentModelContext: { Provider: ({ children }: any) => children },
  useGraphContentModelContext: jest.fn()
}))
jest.mock("../../hooks/use-graph-data-configuration-context", () => ({
  GraphDataConfigurationContext: { Provider: ({ children }: any) => children },
  useGraphDataConfigurationContext: jest.fn()
}))

// Mock logMessageWithReplacement
jest.mock("../../../../lib/log-message", () => ({
  logMessageWithReplacement: jest.fn()
}))

// Mock model type guard
const mockIsGraphContentModel = jest.fn()
jest.mock("../../models/graph-content-model", () => ({
  isGraphContentModel: (...args: unknown[]) => mockIsGraphContentModel(...args)
}))

// Mock uiState for disclosure group expand/collapse
const mockRulerState: Record<string, boolean> = {}
jest.mock("../../../../models/ui-state", () => ({
  uiState: {
    getRulerStateVisibility: (key: string) => mockRulerState[key] ?? false,
    toggleRulerStateVisibility: (key: string) => { mockRulerState[key] = !mockRulerState[key] }
  }
}))

// Helper to create a simple measure menu item (no Controls component)
const createSimpleMenuItem = (title: string, overrides?: Partial<IMeasureMenuItem>): IMeasureMenuItem => ({
  title,
  type: "control",
  checked: false,
  clickHandler: jest.fn(),
  ...overrides
})

// Helper to create a measure menu item with a Controls component
const createControlsMenuItem = (title: string, testId: string): IMeasureMenuItem => ({
  title,
  type: "adornment",
  checked: false,
  componentInfo: {
    Controls: () => <div data-testid={testId}>{title}</div>
  } as any,
  componentContentInfo: { modelClass: {} } as any
})

// Helper to create a group item
const createGroupItem = (
  title: string, rulerStateKey: string, menuItems: IMeasureMenuItem[]
): IGroupItem => ({
  title,
  type: "Group",
  rulerStateKey: rulerStateKey as any,
  menuItems
})

const createMockGraphModel = (measures: Array<IMeasureMenuItem | IGroupItem>) => ({
  plotType: "dotPlot",
  dataConfiguration: {},
  adornmentsStore: {
    getAdornmentsMenuItems: jest.fn(() => measures)
  }
})

const createMockTile = (content: unknown) => ({ content } as any)

describe("GraphMeasurePalette", () => {
  const mockSetShowPalette = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockIsGraphContentModel.mockReturnValue(false)
    Object.keys(mockRulerState).forEach(key => delete mockRulerState[key])
  })

  it("renders empty palette when tile has no graph content", () => {
    render(<GraphMeasurePalette setShowPalette={mockSetShowPalette} />)
    expect(screen.getByTestId("inspector-palette")).toBeInTheDocument()
  })

  describe("with measure items", () => {
    it("renders top-level checkboxes for simple menu items", () => {
      const measures = [
        createSimpleMenuItem("DG.Inspector.graphCount"),
        createSimpleMenuItem("DG.Inspector.showLabels")
      ]
      const graphModel = createMockGraphModel(measures)
      mockIsGraphContentModel.mockReturnValue(true)
      const tile = createMockTile(graphModel)

      render(<GraphMeasurePalette tile={tile} setShowPalette={mockSetShowPalette} />)

      expect(screen.getByRole("checkbox", { name: "DG.Inspector.graphCount" })).toBeInTheDocument()
      expect(screen.getByRole("checkbox", { name: "DG.Inspector.showLabels" })).toBeInTheDocument()
      expect(screen.getByTestId("adornment-checkbox-dg.inspector.graphcount")).toBeInTheDocument()
      expect(screen.getByTestId("adornment-checkbox-dg.inspector.showlabels")).toBeInTheDocument()
    })

    it("renders Controls components for adornment menu items", () => {
      const measures = [createControlsMenuItem("Mean", "mean-controls")]
      const graphModel = createMockGraphModel(measures)
      mockIsGraphContentModel.mockReturnValue(true)
      const tile = createMockTile(graphModel)

      render(<GraphMeasurePalette tile={tile} setShowPalette={mockSetShowPalette} />)

      expect(screen.getByTestId("mean-controls")).toBeInTheDocument()
    })

    it("calls clickHandler when a simple checkbox is clicked", async () => {
      const user = userEvent.setup()
      const clickHandler = jest.fn()
      const measures = [createSimpleMenuItem("DG.Inspector.graphCount", { clickHandler })]
      const graphModel = createMockGraphModel(measures)
      mockIsGraphContentModel.mockReturnValue(true)
      const tile = createMockTile(graphModel)

      render(<GraphMeasurePalette tile={tile} setShowPalette={mockSetShowPalette} />)

      await user.click(screen.getByTestId("adornment-checkbox-dg.inspector.graphcount"))
      expect(clickHandler).toHaveBeenCalledWith(true)
    })

    it("renders checkbox as checked when item is checked", () => {
      const measures = [createSimpleMenuItem("DG.Inspector.graphCount", { checked: true })]
      const graphModel = createMockGraphModel(measures)
      mockIsGraphContentModel.mockReturnValue(true)
      const tile = createMockTile(graphModel)

      render(<GraphMeasurePalette tile={tile} setShowPalette={mockSetShowPalette} />)

      const checkbox = screen.getByTestId("adornment-checkbox-dg.inspector.graphcount")
      expect(checkbox).toHaveAttribute("data-selected", "true")
    })

    it("renders disabled checkbox when item is disabled", () => {
      const measures = [createSimpleMenuItem("DG.Inspector.graphSquares", { disabled: true })]
      const graphModel = createMockGraphModel(measures)
      mockIsGraphContentModel.mockReturnValue(true)
      const tile = createMockTile(graphModel)

      render(<GraphMeasurePalette tile={tile} setShowPalette={mockSetShowPalette} />)

      const checkbox = screen.getByTestId("adornment-checkbox-dg.inspector.graphsquares")
      expect(checkbox).toHaveAttribute("data-disabled", "true")
    })
  })

  describe("disclosure groups", () => {
    const meanItem = createControlsMenuItem("Mean", "mean-controls")
    const medianItem = createControlsMenuItem("Median", "median-controls")
    const groupItem = createGroupItem(
      "DG.Inspector.graphMeasuresOfCenter", "measuresOfCenter", [meanItem, medianItem]
    )

    it("renders group disclosure button", () => {
      const graphModel = createMockGraphModel([groupItem])
      mockIsGraphContentModel.mockReturnValue(true)
      const tile = createMockTile(graphModel)

      render(<GraphMeasurePalette tile={tile} setShowPalette={mockSetShowPalette} />)

      expect(screen.getByRole("button", { name: "DG.Inspector.graphMeasuresOfCenter" })).toBeInTheDocument()
      expect(screen.getByTestId("adornment-toggle-measuresOfCenter")).toBeInTheDocument()
      expect(screen.getByText("DG.Inspector.graphMeasuresOfCenter")).toBeInTheDocument()
    })

    it("hides group items when collapsed", () => {
      const graphModel = createMockGraphModel([groupItem])
      mockIsGraphContentModel.mockReturnValue(true)
      const tile = createMockTile(graphModel)

      render(<GraphMeasurePalette tile={tile} setShowPalette={mockSetShowPalette} />)

      // Group is collapsed by default — panel should be hidden
      const trigger = screen.getByTestId("adornment-toggle-measuresOfCenter")
      expect(trigger).toHaveAttribute("aria-expanded", "false")
      // React Aria DisclosurePanel is hidden but still in DOM
      expect(screen.getByTestId("mean-controls")).not.toBeVisible()
    })

    it("shows group items when expanded", () => {
      mockRulerState.measuresOfCenter = true
      const graphModel = createMockGraphModel([groupItem])
      mockIsGraphContentModel.mockReturnValue(true)
      const tile = createMockTile(graphModel)

      render(<GraphMeasurePalette tile={tile} setShowPalette={mockSetShowPalette} />)

      expect(screen.getByTestId("mean-controls")).toBeInTheDocument()
      expect(screen.getByTestId("median-controls")).toBeInTheDocument()
    })

    it("toggles group visibility when disclosure button is clicked", async () => {
      const user = userEvent.setup()
      const graphModel = createMockGraphModel([groupItem])
      mockIsGraphContentModel.mockReturnValue(true)
      const tile = createMockTile(graphModel)

      render(<GraphMeasurePalette tile={tile} setShowPalette={mockSetShowPalette} />)

      // Initially collapsed
      const trigger = screen.getByTestId("adornment-toggle-measuresOfCenter")
      expect(trigger).toHaveAttribute("aria-expanded", "false")

      // Click to expand — should toggle ruler state
      await user.click(trigger)
      expect(mockRulerState.measuresOfCenter).toBe(true)
    })
  })

  describe("accessibility", () => {
    it("disclosure trigger has aria-expanded attribute", () => {
      const meanItem = createControlsMenuItem("Mean", "mean-controls")
      const groupItem = createGroupItem(
        "DG.Inspector.graphMeasuresOfCenter", "measuresOfCenter", [meanItem]
      )
      const graphModel = createMockGraphModel([groupItem])
      mockIsGraphContentModel.mockReturnValue(true)
      const tile = createMockTile(graphModel)

      render(<GraphMeasurePalette tile={tile} setShowPalette={mockSetShowPalette} />)

      const trigger = screen.getByTestId("adornment-toggle-measuresOfCenter")
      expect(trigger).toHaveAttribute("aria-expanded", "false")
    })

    it("disclosure trigger shows aria-expanded=true when expanded", () => {
      mockRulerState.measuresOfCenter = true
      const meanItem = createControlsMenuItem("Mean", "mean-controls")
      const groupItem = createGroupItem(
        "DG.Inspector.graphMeasuresOfCenter", "measuresOfCenter", [meanItem]
      )
      const graphModel = createMockGraphModel([groupItem])
      mockIsGraphContentModel.mockReturnValue(true)
      const tile = createMockTile(graphModel)

      render(<GraphMeasurePalette tile={tile} setShowPalette={mockSetShowPalette} />)

      const trigger = screen.getByTestId("adornment-toggle-measuresOfCenter")
      expect(trigger).toHaveAttribute("aria-expanded", "true")
    })
  })

  describe("mixed content", () => {
    it("renders both top-level items and groups", () => {
      mockRulerState.measuresOfCenter = true
      const countItem = createSimpleMenuItem("DG.Inspector.graphCount")
      const meanItem = createControlsMenuItem("Mean", "mean-controls")
      const groupItem = createGroupItem(
        "DG.Inspector.graphMeasuresOfCenter", "measuresOfCenter", [meanItem]
      )
      const graphModel = createMockGraphModel([countItem, groupItem])
      mockIsGraphContentModel.mockReturnValue(true)
      const tile = createMockTile(graphModel)

      render(<GraphMeasurePalette tile={tile} setShowPalette={mockSetShowPalette} />)

      // Top-level checkbox
      expect(screen.getByTestId("adornment-checkbox-dg.inspector.graphcount")).toBeInTheDocument()
      // Group header
      expect(screen.getByText("DG.Inspector.graphMeasuresOfCenter")).toBeInTheDocument()
      // Group item (expanded)
      expect(screen.getByTestId("mean-controls")).toBeInTheDocument()
    })
  })
})
