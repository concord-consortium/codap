import { act, renderHook } from "@testing-library/react"
import { FreeTileRow } from "../../models/document/free-tile-row"
import { kDefaultMinWidth } from "../../models/tiles/tile-layout"
import { useTileResize } from "./use-tile-resize"

jest.mock("../../hooks/use-document-container-context", () => ({
  useDocumentContainerContext: () => ({
    current: { clientWidth: 2000, clientHeight: 2000 }
  })
}))

const kResizeIncrement = 20
const kInitialWidth = 300
const kInitialHeight = 200

describe("useTileResize keyboard resize", () => {
  const tileId = "test-tile"

  it("does not update the model during keystrokes, only on blur", () => {
    const mockHistoryService = { handleApplyModelChange: jest.fn(), withoutUndo: jest.fn() }
    const row = FreeTileRow.create({}, { historyService: mockHistoryService })
    row.insertTile(tileId, { x: 100, y: 100, width: kInitialWidth, height: kInitialHeight })
    const tile = {
      content: { type: "Unknown" },
      isResizable: { width: true, height: true },
      minWidth: kDefaultMinWidth
    } as any
    const setChangingTileStyle = jest.fn()
    const applyModelChangeSpy = jest.spyOn(row, "applyModelChange")

    const { result } = renderHook(() =>
      useTileResize({ row, tile, tileId, setChangingTileStyle })
    )

    const tileLayout = row.tiles.get(tileId)!

    // Focus to initialize keyboard resize state
    act(() => result.current.handleResizeFocus())

    // Press ArrowRight three times
    const createArrowKeyEvent = (key: string) => ({ key, preventDefault: jest.fn() }) as any
    act(() => result.current.handleResizeKeyDown(createArrowKeyEvent("ArrowRight")))
    act(() => result.current.handleResizeKeyDown(createArrowKeyEvent("ArrowRight")))
    act(() => result.current.handleResizeKeyDown(createArrowKeyEvent("ArrowRight")))

    // Model should be unchanged during keystrokes.
    expect(tileLayout.width).toBe(kInitialWidth)
    expect(tileLayout.height).toBe(kInitialHeight)
    expect(applyModelChangeSpy).not.toHaveBeenCalled()

    // Blur to commit. Model updates once.
    act(() => result.current.handleResizeBlur())
    expect(tileLayout.width).toBe(kInitialWidth + 3 * kResizeIncrement)
    expect(tileLayout.height).toBe(kInitialHeight)
    expect(applyModelChangeSpy).toHaveBeenCalledTimes(1)
  })
})
