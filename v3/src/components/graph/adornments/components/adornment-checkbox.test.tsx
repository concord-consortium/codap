import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AdornmentCheckbox } from "./adornment-checkbox"

// ---------------------------------------------------------------------------
// Module mocks (must be declared before imports are resolved)
// ---------------------------------------------------------------------------

jest.mock("../../../../utilities/translation/translate", () => ({
  t: (key: string) => key,
}))

jest.mock("../../../../lib/log-message", () => ({
  logMessageWithReplacement: jest.fn(() => "log-msg"),
}))

const mockUpdateTileNotification = jest.fn()
jest.mock("../../../../models/tiles/tile-notifications", () => ({
  updateTileNotification: (operation: string, values: unknown, tile: unknown) =>
    mockUpdateTileNotification(operation, values, tile),
}))

// Mock tile returned by useTileModelContext
const mockTile = { id: "TILE1", content: { type: "Graph" } } as any
jest.mock("../../../../hooks/use-tile-model-context", () => ({
  useTileModelContext: () => ({ tile: mockTile }),
}))

// ---------------------------------------------------------------------------
// Per-test adornment content info — controlled via these mutable stubs
// ---------------------------------------------------------------------------

const adornmentInfoMap: Record<string, any> = {}
jest.mock("../adornment-content-info", () => ({
  getAdornmentContentInfo: (type: string) => adornmentInfoMap[type],
}))

// Mock graph model returned by useGraphContentModelContext
const mockAdornments: any[] = []
const mockApplyModelChange = jest.fn()
const mockGraphModel = {
  adornmentsStore: {
    adornments: mockAdornments,
    addAdornment: jest.fn(),
    hideAdornment: jest.fn(),
  },
  getUpdateCategoriesOptions: () => ({}),
  applyModelChange: mockApplyModelChange,
} as any

jest.mock("../../hooks/use-graph-content-model-context", () => ({
  useGraphContentModelContext: () => mockGraphModel,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simulate applyModelChange executing the action and calling notify() if present */
function setupApplyModelChange() {
  mockApplyModelChange.mockImplementation((action: () => void, options: any) => {
    action()
    if (typeof options?.notify === "function") {
      options.notify()
    }
  })
}

/** Build an adornment info stub with an optional notificationOperation */
function registerStub(type: string, notificationOperation?: string) {
  adornmentInfoMap[type] = {
    modelClass: { create: () => ({ type, isVisible: false }) },
    undoRedoKeys: {
      undoAdd: "undo-add",
      redoAdd: "redo-add",
      undoRemove: "undo-remove",
      redoRemove: "redo-remove",
    },
    notificationOperation,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AdornmentCheckbox notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAdornments.length = 0
    setupApplyModelChange()

    // Register the three adornment types used by the tests
    registerStub("Mean", "togglePlottedMean")
    registerStub("Median", "togglePlottedMedian")
    registerStub("Count") // no notificationOperation
  })

  it("emits togglePlottedMean when the mean checkbox is toggled", async () => {
    render(
      <AdornmentCheckbox classNameValue="mean" labelKey="DG.Inspector.graphPlottedMean" type="Mean" />
    )
    await userEvent.click(screen.getByTestId("adornment-checkbox-mean"))
    expect(mockUpdateTileNotification).toHaveBeenCalledWith("togglePlottedMean", expect.any(Object), mockTile)
  })

  it("emits togglePlottedMedian when the median checkbox is toggled", async () => {
    render(
      <AdornmentCheckbox classNameValue="median" labelKey="DG.Inspector.graphPlottedMedian" type="Median" />
    )
    await userEvent.click(screen.getByTestId("adornment-checkbox-median"))
    expect(mockUpdateTileNotification).toHaveBeenCalledWith("togglePlottedMedian", expect.any(Object), mockTile)
  })

  it("does not emit a notification for an adornment with no notificationOperation", async () => {
    render(
      <AdornmentCheckbox classNameValue="count" labelKey="DG.Inspector.graphCount" type="Count" />
    )
    await userEvent.click(screen.getByTestId("adornment-checkbox-count"))
    expect(mockUpdateTileNotification).not.toHaveBeenCalled()
  })

  it("passes isChecked:true when toggling on", async () => {
    render(
      <AdornmentCheckbox classNameValue="mean" labelKey="DG.Inspector.graphPlottedMean" type="Mean" />
    )
    await userEvent.click(screen.getByTestId("adornment-checkbox-mean"))
    expect(mockUpdateTileNotification).toHaveBeenCalledWith(
      "togglePlottedMean", { isChecked: true }, mockTile
    )
  })

  it("passes isChecked:false when toggling off", async () => {
    // Pre-populate adornments so the checkbox starts visible/on
    const adornment = { type: "Mean", isVisible: true }
    mockAdornments.push(adornment)

    render(
      <AdornmentCheckbox classNameValue="mean" labelKey="DG.Inspector.graphPlottedMean" type="Mean" />
    )
    // Click to uncheck (hide)
    await userEvent.click(screen.getByTestId("adornment-checkbox-mean"))
    expect(mockUpdateTileNotification).toHaveBeenCalledWith(
      "togglePlottedMean", { isChecked: false }, mockTile
    )
  })
})
