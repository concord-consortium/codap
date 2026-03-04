import React from "react"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DisplayConfigPalette } from "./display-config-palette"

// Mock InspectorPalette to just render children
jest.mock("../../../inspector-panel", () => ({
  InspectorPalette: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="inspector-palette">{children}</div>
  )
}))

// Mock SVG icon
jest.mock("../../../../assets/icons/inspector-panel/configuration-icon.svg", () => "ConfigurationIcon")

// Mock translation to return the key
jest.mock("../../../../utilities/translation/translate", () => ({
  t: (key: string) => key
}))

// Mock mstReaction to be a no-op
jest.mock("../../../../utilities/mst-reaction", () => ({
  mstReaction: jest.fn()
}))

// Mock logMessageWithReplacement
jest.mock("../../../../lib/log-message", () => ({
  logMessageWithReplacement: jest.fn()
}))

// Mock tileNotification
jest.mock("../../../../models/tiles/tile-notifications", () => ({
  tileNotification: jest.fn()
}))

// Mock model type guards
const mockIsGraphContentModel = jest.fn()
const mockIsBinnedPlotModel = jest.fn()
const mockIsBarChartModel = jest.fn()

jest.mock("../../models/graph-content-model", () => ({
  isGraphContentModel: (...args: unknown[]) => mockIsGraphContentModel(...args)
}))
jest.mock("../../plots/histogram/histogram-model", () => ({
  isBinnedPlotModel: (...args: unknown[]) => mockIsBinnedPlotModel(...args)
}))
jest.mock("../../plots/bar-chart/bar-chart-model", () => ({
  isBarChartModel: (...args: unknown[]) => mockIsBarChartModel(...args)
}))

interface MockPlot {
  displayType: string
  isBinned: boolean
  showDisplayTypeSelection: boolean
  showFusePointsIntoBars: boolean
  showBreakdownTypes: boolean
  isUnivariateNumeric: boolean
}

const createMockPlot = (overrides?: Partial<MockPlot>): MockPlot => ({
  displayType: "points",
  isBinned: false,
  showDisplayTypeSelection: true,
  showFusePointsIntoBars: false,
  showBreakdownTypes: false,
  isUnivariateNumeric: true,
  ...overrides
})

const createMockGraphModel = (plotOverrides?: Partial<MockPlot>, extras?: Record<string, unknown>) => ({
  plot: createMockPlot(plotOverrides),
  dataConfiguration: { primaryAttributeType: "numeric" },
  pointsFusedIntoBars: false,
  applyModelChange: jest.fn((fn: () => void) => fn()),
  configureUnivariateNumericPlot: jest.fn(),
  fusePointsIntoBars: jest.fn(),
  pointDescription: { setPointStrokeSameAsFill: jest.fn() },
  ...extras
})

const createMockBinnedPlot = (overrides?: Partial<MockPlot>) => ({
  ...createMockPlot({ isBinned: true, ...overrides }),
  binWidth: 10,
  binAlignment: 0,
  binDetails: () => ({ binWidth: 10, binAlignment: 0 }),
  setBinWidth: jest.fn(),
  setBinAlignment: jest.fn()
})

const createMockTile = (content: unknown) => ({
  content
} as any)

describe("DisplayConfigPalette", () => {
  const mockSetShowPalette = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockIsGraphContentModel.mockReturnValue(false)
    mockIsBinnedPlotModel.mockReturnValue(false)
    mockIsBarChartModel.mockReturnValue(false)
  })

  it("renders nothing when tile has no graph content", () => {
    render(
      <DisplayConfigPalette setShowPalette={mockSetShowPalette} />
    )
    expect(screen.getByTestId("inspector-palette")).toBeInTheDocument()
    expect(screen.queryByTestId("points-radio-button")).not.toBeInTheDocument()
  })

  describe("with point display type selection", () => {
    beforeEach(() => {
      const graphModel = createMockGraphModel()
      mockIsGraphContentModel.mockReturnValue(true)
      // Make isGraphContentModel return the model when called, and also make the ternary work
      mockIsGraphContentModel.mockImplementation((content: unknown) => content === graphModel)
    })

    it("renders radio buttons for display types", () => {
      const graphModel = createMockGraphModel()
      mockIsGraphContentModel.mockImplementation(() => true)
      const tile = createMockTile(graphModel)

      render(
        <DisplayConfigPalette tile={tile} setShowPalette={mockSetShowPalette} />
      )

      expect(screen.getByTestId("points-radio-button")).toBeInTheDocument()
      expect(screen.getByTestId("bins-radio-button")).toBeInTheDocument()
      expect(screen.getByTestId("bars-radio-button")).toBeInTheDocument()
    })

    it("shows Bar for Each Point even when bins are selected", () => {
      const binnedPlot = createMockBinnedPlot({ showDisplayTypeSelection: true })
      const graphModel = createMockGraphModel(undefined, { plot: binnedPlot })
      mockIsGraphContentModel.mockReturnValue(true)
      mockIsBinnedPlotModel.mockReturnValue(true)
      const tile = createMockTile(graphModel)

      render(
        <DisplayConfigPalette tile={tile} setShowPalette={mockSetShowPalette} />
      )

      expect(screen.getByTestId("bars-radio-button")).toBeInTheDocument()
    })
  })

  describe("bin options", () => {
    it("shows bin width and alignment when bins are selected", () => {
      const binnedPlot = createMockBinnedPlot({ showDisplayTypeSelection: true })
      const graphModel = createMockGraphModel(undefined, { plot: binnedPlot })
      mockIsGraphContentModel.mockReturnValue(true)
      mockIsBinnedPlotModel.mockReturnValue(true)
      const tile = createMockTile(graphModel)

      render(
        <DisplayConfigPalette tile={tile} setShowPalette={mockSetShowPalette} />
      )

      expect(screen.getByTestId("graph-bin-width-setting")).toBeInTheDocument()
      expect(screen.getByTestId("graph-bin-alignment-setting")).toBeInTheDocument()
    })

    it("does not show bin options when points are selected", () => {
      const graphModel = createMockGraphModel()
      mockIsGraphContentModel.mockReturnValue(true)
      const tile = createMockTile(graphModel)

      render(
        <DisplayConfigPalette tile={tile} setShowPalette={mockSetShowPalette} />
      )

      expect(screen.queryByTestId("graph-bin-width-setting")).not.toBeInTheDocument()
    })

    it("commits bin width on Enter key", async () => {
      const user = userEvent.setup()
      const binnedPlot = createMockBinnedPlot({ showDisplayTypeSelection: true })
      const graphModel = createMockGraphModel(undefined, { plot: binnedPlot })
      mockIsGraphContentModel.mockReturnValue(true)
      mockIsBinnedPlotModel.mockReturnValue(true)
      const tile = createMockTile(graphModel)

      render(
        <DisplayConfigPalette tile={tile} setShowPalette={mockSetShowPalette} />
      )

      const binWidthInput = within(screen.getByTestId("graph-bin-width-setting")).getByRole("textbox")
      await user.clear(binWidthInput)
      await user.type(binWidthInput, "20{Enter}")
      expect(graphModel.applyModelChange).toHaveBeenCalled()
    })

    it("commits bin alignment on blur", async () => {
      const user = userEvent.setup()
      const binnedPlot = createMockBinnedPlot({ showDisplayTypeSelection: true })
      const graphModel = createMockGraphModel(undefined, { plot: binnedPlot })
      mockIsGraphContentModel.mockReturnValue(true)
      mockIsBinnedPlotModel.mockReturnValue(true)
      const tile = createMockTile(graphModel)

      render(
        <DisplayConfigPalette tile={tile} setShowPalette={mockSetShowPalette} />
      )

      const alignmentInput = within(screen.getByTestId("graph-bin-alignment-setting")).getByRole("textbox")
      await user.clear(alignmentInput)
      await user.type(alignmentInput, "5")
      await user.tab()
      expect(graphModel.applyModelChange).toHaveBeenCalled()
    })
  })

  describe("fuse into bars checkbox", () => {
    it("shows checkbox when showFusePointsIntoBars is true", () => {
      const graphModel = createMockGraphModel({
        showDisplayTypeSelection: true,
        showFusePointsIntoBars: true
      })
      mockIsGraphContentModel.mockReturnValue(true)
      const tile = createMockTile(graphModel)

      render(
        <DisplayConfigPalette tile={tile} setShowPalette={mockSetShowPalette} />
      )

      expect(screen.getByTestId("bar-chart-checkbox")).toBeInTheDocument()
    })

    it("toggles fuse into bars on click", async () => {
      const user = userEvent.setup()
      const graphModel = createMockGraphModel({
        showDisplayTypeSelection: true,
        showFusePointsIntoBars: true
      })
      mockIsGraphContentModel.mockReturnValue(true)
      const tile = createMockTile(graphModel)

      render(
        <DisplayConfigPalette tile={tile} setShowPalette={mockSetShowPalette} />
      )

      await user.click(screen.getByTestId("bar-chart-checkbox"))
      expect(graphModel.applyModelChange).toHaveBeenCalled()
    })
  })

  describe("breakdown type radios", () => {
    it("shows breakdown types when showBreakdownTypes is true", () => {
      const graphModel = createMockGraphModel({
        showDisplayTypeSelection: true,
        showFusePointsIntoBars: true,
        showBreakdownTypes: true
      })
      mockIsGraphContentModel.mockReturnValue(true)
      mockIsBarChartModel.mockReturnValue(true)
      const tile = createMockTile(graphModel)

      render(
        <DisplayConfigPalette tile={tile} setShowPalette={mockSetShowPalette} />
      )

      expect(screen.getByTestId("count-radio-button")).toBeInTheDocument()
      expect(screen.getByTestId("percent-radio-button")).toBeInTheDocument()
      expect(screen.getByTestId("formula-radio-button")).toBeInTheDocument()
    })
  })
})
