/* eslint-disable testing-library/no-node-access */
import { render, fireEvent } from "@testing-library/react"
import { ColumnResizeHandle, kColumnResizeHandleInteractionWidth } from "./column-resize-handle"

// JSDOM doesn't implement PointerEvent; polyfill it from MouseEvent
class MockPointerEvent extends MouseEvent {
  pointerId: number
  constructor(type: string, init?: PointerEventInit) {
    super(type, init)
    this.pointerId = init?.pointerId ?? 0
  }
}
window.PointerEvent = MockPointerEvent as any

describe("ColumnResizeHandle", () => {
  // Simulates a container of 400px with a table that has 5px left margin and 10px total margin offset,
  // giving a table width of 390px. minLeft/maxLeft represent clamped handle positions within the container.
  const minLeft = 65   // 5 (margin) + 60 (min column width)
  const maxLeft = 335  // 5 (margin) + 390 (table width) - 60 (min column width)
  const initialWidth = 200

  it("renders with correct position", () => {
    const onResize = jest.fn()
    render(
      <ColumnResizeHandle
        resizeWidth={initialWidth}
        minLeft={minLeft}
        maxLeft={maxLeft}
        onResize={onResize}
      />
    )
    const handle = document.querySelector(".column-resize-handle") as HTMLElement
    expect(handle).not.toBeNull()
    expect(handle.style.left).toBe(`${initialWidth - kColumnResizeHandleInteractionWidth / 2}px`)
  })

  it("shows is-resizing class only during drag", () => {
    const onResize = jest.fn()
    render(
      <ColumnResizeHandle
        resizeWidth={initialWidth}
        minLeft={minLeft}
        maxLeft={maxLeft}
        onResize={onResize}
      />
    )
    const handle = document.querySelector(".column-resize-handle") as HTMLElement
    const divider = document.querySelector(".column-resize-handle-divider") as HTMLElement
    expect(divider.classList.contains("is-resizing")).toBe(false)

    // begin drag
    fireEvent.pointerDown(handle, { clientX: initialWidth })
    expect(divider.classList.contains("is-resizing")).toBe(true)

    // end drag
    fireEvent.pointerUp(document)
    expect(divider.classList.contains("is-resizing")).toBe(false)
  })

  it("calls onResize during drag with clamped width", () => {
    const onResize = jest.fn()
    render(
      <ColumnResizeHandle
        resizeWidth={initialWidth}
        minLeft={minLeft}
        maxLeft={maxLeft}
        onResize={onResize}
      />
    )
    const handle = document.querySelector(".column-resize-handle") as HTMLElement

    // begin drag at current position
    fireEvent.pointerDown(handle, { clientX: initialWidth })

    // drag right by 50px
    fireEvent.pointerMove(document, { clientX: initialWidth + 50 })
    expect(onResize).toHaveBeenLastCalledWith(250)

    // drag left by 100px from start
    fireEvent.pointerMove(document, { clientX: initialWidth - 100 })
    expect(onResize).toHaveBeenLastCalledWith(100)

    onResize.mockClear()

    // drag beyond minimum — should clamp to minLeft
    fireEvent.pointerMove(document, { clientX: 10 })
    expect(onResize).toHaveBeenLastCalledWith(minLeft)

    onResize.mockClear()

    // drag beyond maximum — should clamp to maxLeft
    fireEvent.pointerMove(document, { clientX: 1000 })
    expect(onResize).toHaveBeenLastCalledWith(maxLeft)

    // end drag — calls onResize with isComplete=true
    onResize.mockClear()
    fireEvent.pointerUp(document)
    expect(onResize).toHaveBeenCalledWith(maxLeft, true)
  })

  it("does not call onResize when width hasn't changed", () => {
    const onResize = jest.fn()
    render(
      <ColumnResizeHandle
        resizeWidth={initialWidth}
        minLeft={minLeft}
        maxLeft={maxLeft}
        onResize={onResize}
      />
    )
    const handle = document.querySelector(".column-resize-handle") as HTMLElement

    fireEvent.pointerDown(handle, { clientX: initialWidth })
    onResize.mockClear()

    // move to same position — no change
    fireEvent.pointerMove(document, { clientX: initialWidth })
    expect(onResize).not.toHaveBeenCalled()

    fireEvent.pointerUp(document)
  })

  it("cleans up document listeners after drag ends", () => {
    const onResize = jest.fn()
    render(
      <ColumnResizeHandle
        resizeWidth={initialWidth}
        minLeft={minLeft}
        maxLeft={maxLeft}
        onResize={onResize}
      />
    )
    const handle = document.querySelector(".column-resize-handle") as HTMLElement

    // begin and end a drag
    fireEvent.pointerDown(handle, { clientX: initialWidth })
    fireEvent.pointerUp(document)
    onResize.mockClear()

    // subsequent pointermove on document should not trigger onResize
    fireEvent.pointerMove(document, { clientX: 300 })
    expect(onResize).not.toHaveBeenCalled()
  })
})
