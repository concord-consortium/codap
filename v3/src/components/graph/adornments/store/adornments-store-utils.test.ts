import { getAdornmentsMenuItemsFromTheStore, IMeasureMenuItem } from "./adornments-store-utils"
import { updateTileNotification } from "../../../../models/tiles/tile-notifications"

jest.mock("../../../../models/tiles/tile-notifications", () => ({
  updateTileNotification: jest.fn()
}))

function findItem(items: any[], title: string): IMeasureMenuItem {
  return items.find((i) => i.title === title) as IMeasureMenuItem
}

describe("adornment notification operation names match V2", () => {
  const tile = { id: "TILE1", content: { type: "Graph" } } as any

  function buildStore(overrides: Partial<any> = {}) {
    return {
      showMeasureLabels: false,
      showConnectingLines: false,
      interceptLocked: false,
      showSquaresOfResiduals: false,
      isShowingAdornment: () => false,
      applyModelChange: jest.fn(),
      toggleShowLabels: jest.fn(),
      toggleShowConnectingLines: jest.fn(),
      toggleInterceptLocked: jest.fn(),
      toggleShowSquaresOfResiduals: jest.fn(),
      ...overrides
    } as any
  }

  beforeEach(() => (updateTileNotification as jest.Mock).mockClear())

  it("emits 'show measure labels' when labels are currently hidden", () => {
    const items = getAdornmentsMenuItemsFromTheStore(buildStore(), tile, "dotPlot", false)
    findItem(items, "DG.Inspector.showLabels").clickHandler?.()
    expect(updateTileNotification).toHaveBeenCalledWith("show measure labels", { isChecked: true }, tile)
  })

  it("emits 'hide measure labels' when labels are currently shown", () => {
    const items = getAdornmentsMenuItemsFromTheStore(buildStore({ showMeasureLabels: true }), tile, "dotPlot", false)
    findItem(items, "DG.Inspector.showLabels").clickHandler?.()
    expect(updateTileNotification).toHaveBeenCalledWith("hide measure labels", { isChecked: false }, tile)
  })

  it("emits 'toggle connecting line' for the connecting-lines toggle", () => {
    const items = getAdornmentsMenuItemsFromTheStore(buildStore(), tile, "scatterPlot", false)
    findItem(items, "DG.Inspector.graphConnectingLine").clickHandler?.()
    expect(updateTileNotification).toHaveBeenCalledWith("toggle connecting line", { isChecked: true }, tile)
  })

  it("emits 'toggle lock intercept' for the intercept-locked toggle", () => {
    const items = getAdornmentsMenuItemsFromTheStore(buildStore(), tile, "scatterPlot", false)
    findItem(items, "DG.Inspector.graphInterceptLocked").clickHandler?.()
    expect(updateTileNotification).toHaveBeenCalledWith("toggle lock intercept", { isChecked: true }, tile)
  })

  it("emits 'toggle show squares' for the squares-of-residuals toggle", () => {
    const items = getAdornmentsMenuItemsFromTheStore(buildStore(), tile, "scatterPlot", false)
    findItem(items, "DG.Inspector.graphSquares").clickHandler?.()
    expect(updateTileNotification).toHaveBeenCalledWith("toggle show squares", { isChecked: true }, tile)
  })
})
