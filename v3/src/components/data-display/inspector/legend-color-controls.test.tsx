import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LegendColorControls, LegendBinsSelect, LegendRangeInputs } from "./legend-color-controls"

// Mock translation to return the key
jest.mock("../../../utilities/translation/translate", () => ({
  t: (key: string) => key,
  translate: (key: string) => key
}))

// Mock PointColorSetting to render a simple swatch button that exposes closeTrigger
jest.mock("./point-color-setting", () => ({
  PointColorSetting: ({ propertyLabel, closeTrigger, onColorChange, swatchBackgroundColor }: any) => (
    <button data-testid={`color-swatch-${propertyLabel}`}
      data-close-trigger={closeTrigger ?? ""}
      onClick={() => onColorChange("#123456")}
      style={{ backgroundColor: swatchBackgroundColor }}>
      {propertyLabel}
    </button>
  )
}))

const createMockDescription = (overrides?: Record<string, unknown>) => ({
  pointColor: "#0000FF",
  setPointColor: jest.fn(),
  applyModelChange: jest.fn((fn: () => void) => fn()),
  ...overrides
})

const createMockDataConfig = (overrides?: Record<string, unknown>) => ({
  attributeID: jest.fn(() => "attr-1"),
  attributeType: jest.fn(() => undefined),
  categoryArrayForAttrRole: jest.fn(() => []),
  numericValuesForAttrRole: jest.fn(() => [0, 10, 20, 40]),
  metadata: {
    getAttributeColorRange: jest.fn(() => ({ low: "#0000FF", high: "#FF0000" })),
    getAttributeBinningType: jest.fn(() => "quantize"),
    getAttributeLegendRange: jest.fn((): { min?: number, max?: number } => ({ min: undefined, max: undefined })),
    setAttributeColor: jest.fn(),
    setAttributeBinningType: jest.fn(),
    setAttributeLegendMin: jest.fn(),
    setAttributeLegendMax: jest.fn(),
    applyModelChange: jest.fn((fn: () => void) => fn())
  },
  getLegendColorForCategory: jest.fn((cat: string) => cat === "cat-a" ? "#FF0000" : "#00FF00"),
  setLegendColorForCategory: jest.fn(),
  legendQuantilesAreLocked: false,
  setLegendQuantilesAreLocked: jest.fn(),
  applyModelChange: jest.fn((fn: () => void) => fn()),
  ...overrides
})

describe("LegendColorControls", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders single fill color picker when no legend attribute type", () => {
    const desc = createMockDescription()
    const config = createMockDataConfig()
    render(<LegendColorControls dataConfiguration={config as any} displayItemDescription={desc as any} />)

    expect(screen.getByTestId("color-swatch-DG.Inspector.color")).toBeInTheDocument()
  })

  it("calls applyModelChange when fill color changes", async () => {
    const user = userEvent.setup()
    const desc = createMockDescription()
    const config = createMockDataConfig()
    render(<LegendColorControls dataConfiguration={config as any} displayItemDescription={desc as any} />)

    await user.click(screen.getByTestId("color-swatch-DG.Inspector.color"))
    expect(desc.applyModelChange).toHaveBeenCalled()
    expect(desc.setPointColor).toHaveBeenCalledWith("#123456")
  })

  describe("categorical legend", () => {
    it("renders a color picker for each category", () => {
      const desc = createMockDescription()
      const config = createMockDataConfig({
        attributeType: jest.fn(() => "categorical"),
        categoryArrayForAttrRole: jest.fn(() => ["cat-a", "cat-b", "cat-c"])
      })
      render(<LegendColorControls dataConfiguration={config as any} displayItemDescription={desc as any} />)

      expect(screen.getByTestId("color-swatch-cat-a")).toBeInTheDocument()
      expect(screen.getByTestId("color-swatch-cat-b")).toBeInTheDocument()
      expect(screen.getByTestId("color-swatch-cat-c")).toBeInTheDocument()
    })

    it("increments closeTrigger on category list scroll to close color pickers", () => {
      const desc = createMockDescription()
      const config = createMockDataConfig({
        attributeType: jest.fn(() => "categorical"),
        categoryArrayForAttrRole: jest.fn(() => ["cat-a", "cat-b"])
      })
      render(<LegendColorControls dataConfiguration={config as any} displayItemDescription={desc as any} />)

      const swatch = screen.getByTestId("color-swatch-cat-a")
      expect(swatch).toHaveAttribute("data-close-trigger", "0")

      // Scroll the category container
      // eslint-disable-next-line testing-library/no-node-access
      const scrollContainer = swatch.closest(".cat-color-setting")!
      fireEvent.scroll(scrollContainer)

      expect(swatch).toHaveAttribute("data-close-trigger", "1")
    })

    it("calls setLegendColorForCategory when a category color changes", async () => {
      const user = userEvent.setup()
      const desc = createMockDescription()
      const config = createMockDataConfig({
        attributeType: jest.fn(() => "categorical"),
        categoryArrayForAttrRole: jest.fn(() => ["cat-a"])
      })
      render(<LegendColorControls dataConfiguration={config as any} displayItemDescription={desc as any} />)

      await user.click(screen.getByTestId("color-swatch-cat-a"))
      expect(config.applyModelChange).toHaveBeenCalled()
      expect(config.setLegendColorForCategory).toHaveBeenCalledWith("cat-a", "#123456")
    })
  })

  describe("numeric legend", () => {
    it("renders two color pickers and lock quantiles checkbox", () => {
      const desc = createMockDescription()
      const config = createMockDataConfig({
        attributeType: jest.fn(() => "numeric")
      })
      render(<LegendColorControls dataConfiguration={config as any} displayItemDescription={desc as any} />)

      // Two distinct color swatches for low and high
      expect(screen.getByTestId("color-swatch-DG.Inspector.legendColorLow")).toBeInTheDocument()
      expect(screen.getByTestId("color-swatch-DG.Inspector.legendColorHigh")).toBeInTheDocument()
      // Lock quantiles checkbox
      expect(screen.getByTestId("lock-legend-quantiles-checkbox")).toBeInTheDocument()
      expect(screen.getByText("DG.Inspector.lockLegendQuantiles")).toBeInTheDocument()
    })

    it("toggles lock quantiles checkbox", async () => {
      const user = userEvent.setup()
      const desc = createMockDescription()
      const config = createMockDataConfig({
        attributeType: jest.fn(() => "numeric")
      })
      render(<LegendColorControls dataConfiguration={config as any} displayItemDescription={desc as any} />)

      await user.click(screen.getByTestId("lock-legend-quantiles-checkbox"))
      expect(config.applyModelChange).toHaveBeenCalled()
      expect(config.setLegendQuantilesAreLocked).toHaveBeenCalledWith(true)
    })

    it("shows checkbox as selected when quantiles are locked", () => {
      const desc = createMockDescription()
      const config = createMockDataConfig({
        attributeType: jest.fn(() => "numeric"),
        legendQuantilesAreLocked: true
      })
      render(<LegendColorControls dataConfiguration={config as any} displayItemDescription={desc as any} />)

      const checkbox = screen.getByTestId("lock-legend-quantiles-checkbox")
      expect(checkbox).toHaveAttribute("data-selected", "true")
    })
  })

  describe("color legend", () => {
    it("returns null for color-type legend attribute", () => {
      const desc = createMockDescription()
      const config = createMockDataConfig({
        attributeType: jest.fn(() => "color")
      })
      const { container } = render(
        <LegendColorControls dataConfiguration={config as any} displayItemDescription={desc as any} />
      )

      expect(container.innerHTML).toBe("")
    })
  })
})

describe("LegendBinsSelect", () => {
  it("renders select with label", () => {
    const config = createMockDataConfig()
    render(<LegendBinsSelect dataConfiguration={config as any} />)

    expect(screen.getByText("V3.Inspector.graph.legendBins")).toBeInTheDocument()
    expect(screen.getByTestId("legend-bins-type-select")).toBeInTheDocument()
  })

  it("renders with correct aria-label", () => {
    const config = createMockDataConfig()
    render(<LegendBinsSelect dataConfiguration={config as any} />)

    expect(screen.getByRole("button", { name: /V3.Inspector.graph.legendBins/i })).toBeInTheDocument()
  })

  it("disables the select when the legend quantiles are locked", () => {
    const config = createMockDataConfig({ legendQuantilesAreLocked: true })
    render(<LegendBinsSelect dataConfiguration={config as any} />)

    expect(screen.getByRole("button", { name: /V3.Inspector.graph.legendBins/i })).toBeDisabled()
  })
})

describe("LegendRangeInputs", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders labeled Min and Max inputs", () => {
    const config = createMockDataConfig()
    render(<LegendRangeInputs dataConfiguration={config as any} />)

    expect(screen.getByText("V3.Inspector.graph.legendRange")).toBeInTheDocument()
    expect(screen.getByTestId("legend-range-min-input")).toBeInTheDocument()
    expect(screen.getByTestId("legend-range-max-input")).toBeInTheDocument()
  })

  it("pre-fills inputs with the data extent when no override is set", () => {
    const config = createMockDataConfig()
    render(<LegendRangeInputs dataConfiguration={config as any} />)

    expect(screen.getByTestId("legend-range-min-input")).toHaveValue("0")
    expect(screen.getByTestId("legend-range-max-input")).toHaveValue("40")
  })

  it("pre-fills inputs with override values when set", () => {
    const config = createMockDataConfig()
    config.metadata.getAttributeLegendRange = jest.fn(() => ({ min: 5, max: 25 }))
    render(<LegendRangeInputs dataConfiguration={config as any} />)

    expect(screen.getByTestId("legend-range-min-input")).toHaveValue("5")
    expect(screen.getByTestId("legend-range-max-input")).toHaveValue("25")
  })

  it("commits a valid min on Enter via applyModelChange", async () => {
    const user = userEvent.setup()
    const config = createMockDataConfig()
    render(<LegendRangeInputs dataConfiguration={config as any} />)

    const minInput = screen.getByTestId("legend-range-min-input")
    await user.clear(minInput)
    await user.type(minInput, "10{enter}")
    expect(config.metadata.applyModelChange).toHaveBeenCalled()
    expect(config.metadata.setAttributeLegendMin).toHaveBeenCalledWith("attr-1", 10)
  })

  it("commits a valid max on blur via applyModelChange", async () => {
    const user = userEvent.setup()
    const config = createMockDataConfig()
    render(<LegendRangeInputs dataConfiguration={config as any} />)

    const maxInput = screen.getByTestId("legend-range-max-input")
    await user.clear(maxInput)
    await user.type(maxInput, "30")
    await user.tab()
    expect(config.metadata.setAttributeLegendMax).toHaveBeenCalledWith("attr-1", 30)
  })

  it("commits negative values", async () => {
    const user = userEvent.setup()
    const config = createMockDataConfig()
    render(<LegendRangeInputs dataConfiguration={config as any} />)

    const minInput = screen.getByTestId("legend-range-min-input")
    await user.clear(minInput)
    await user.type(minInput, "-5{enter}")
    expect(config.metadata.setAttributeLegendMin).toHaveBeenCalledWith("attr-1", -5)
  })

  it("silently reverts the min field when the typed value is >= the max", async () => {
    const user = userEvent.setup()
    const config = createMockDataConfig()
    render(<LegendRangeInputs dataConfiguration={config as any} />)

    const minInput = screen.getByTestId("legend-range-min-input")
    await user.clear(minInput)
    await user.type(minInput, "50{enter}") // 50 >= data max of 40
    expect(config.metadata.setAttributeLegendMin).not.toHaveBeenCalled()
    expect(minInput).toHaveValue("0") // reverted to previous committed value
  })

  it("clears the override when the field is emptied and committed", async () => {
    const user = userEvent.setup()
    const config = createMockDataConfig()
    config.metadata.getAttributeLegendRange = jest.fn(() => ({ min: 5, max: 25 }))
    render(<LegendRangeInputs dataConfiguration={config as any} />)

    const minInput = screen.getByTestId("legend-range-min-input")
    await user.clear(minInput)
    await user.type(minInput, "{enter}")
    expect(config.metadata.setAttributeLegendMin).toHaveBeenCalledWith("attr-1", undefined)
  })

  it("cancels the in-progress edit on Escape", async () => {
    const user = userEvent.setup()
    const config = createMockDataConfig()
    render(<LegendRangeInputs dataConfiguration={config as any} />)

    const minInput = screen.getByTestId("legend-range-min-input")
    await user.clear(minInput)
    await user.type(minInput, "7{escape}")
    expect(config.metadata.setAttributeLegendMin).not.toHaveBeenCalled()
    expect(minInput).toHaveValue("0")
  })

  it("also clears the other override when clearing one would leave it orphaned", async () => {
    const user = userEvent.setup()
    const config = createMockDataConfig()
    // both overrides sit above the data extent ([0, 40]); clearing max reverts it to the data
    // max of 40, which would leave min=50 orphaned (a reversed range), so min is cleared too
    config.metadata.getAttributeLegendRange = jest.fn(() => ({ min: 50, max: 200 }))
    render(<LegendRangeInputs dataConfiguration={config as any} />)

    const maxInput = screen.getByTestId("legend-range-max-input")
    await user.clear(maxInput)
    await user.type(maxInput, "{enter}")
    expect(config.metadata.setAttributeLegendMax).toHaveBeenCalledWith("attr-1", undefined)
    expect(config.metadata.setAttributeLegendMin).toHaveBeenCalledWith("attr-1", undefined)
  })

  it("leaves the other override in place when clearing one keeps the range valid", async () => {
    const user = userEvent.setup()
    const config = createMockDataConfig()
    // min=10 still brackets the data extent ([0, 40]) after max reverts to 40, so it stays
    config.metadata.getAttributeLegendRange = jest.fn(() => ({ min: 10, max: 25 }))
    render(<LegendRangeInputs dataConfiguration={config as any} />)

    const maxInput = screen.getByTestId("legend-range-max-input")
    await user.clear(maxInput)
    await user.type(maxInput, "{enter}")
    expect(config.metadata.setAttributeLegendMax).toHaveBeenCalledWith("attr-1", undefined)
    expect(config.metadata.setAttributeLegendMin).not.toHaveBeenCalled()
  })

  it("disables the Min and Max inputs when the legend quantiles are locked", () => {
    const config = createMockDataConfig({ legendQuantilesAreLocked: true })
    render(<LegendRangeInputs dataConfiguration={config as any} />)

    expect(screen.getByTestId("legend-range-min-input")).toBeDisabled()
    expect(screen.getByTestId("legend-range-max-input")).toBeDisabled()
  })
})
