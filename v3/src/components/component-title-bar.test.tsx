import { DndContext } from "@dnd-kit/core"
import React from "react"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { ComponentTitleBar } from "./component-title-bar"
import { ITileLikeModel } from "../models/tiles/tile-content-info"
import { ITileModel, TileModel } from "../models/tiles/tile-model"

const mockGetTitle = jest.fn()
jest.mock("../models/tiles/tile-content-info", () => ({
  ...jest.requireActual("../models/tiles/tile-content-info"),
  getTitle: (tile: ITileLikeModel) => mockGetTitle(tile)
}))

describe("ComponentTitleBar", () => {

  const parentRenderCounter = jest.fn()
  const titleRenderCounter = jest.fn()
  const childRenderCounter = jest.fn()

  // getTitle() is called on every render, so we use it to trigger our counter
  mockGetTitle.mockImplementation(() => titleRenderCounter())

  interface ICounter {
    label: string
    fn: jest.Mock
  }
  function RenderCounter({ label, fn }: ICounter) {
    fn()
    return <>{`${label} calls: ${fn.mock.calls.length}`}</>
  }

  interface IParent {
    tile: ITileModel
  }
  function Parent({ tile }: IParent) {
    return (
      <DndContext>
        <ComponentTitleBar tile={tile}>
          <RenderCounter label="Child" fn={childRenderCounter} />
        </ComponentTitleBar>
        <RenderCounter label="Parent" fn={parentRenderCounter} />
      </DndContext>
    )
  }

  it("renders successfully and efficiently", () => {
    // will create UnknownContentModel
    const tile = TileModel.create({ _title: "title", content: {} as any })
    render(<Parent tile={tile}/>)
    expect(screen.getByText("title")).toBeInTheDocument()
    expect(parentRenderCounter).toHaveBeenCalledTimes(1)
    expect(titleRenderCounter).toHaveBeenCalledTimes(1)
    expect(childRenderCounter).toHaveBeenCalledTimes(1)
    // change the title
    act(() => tile.setUserTitle("newTitle"))
    // ComponentTitleBar is re-rendered, but not parent or children
    expect(screen.getByText("newTitle")).toBeInTheDocument()
    expect(screen.getByText("Parent calls: 1")).toBeInTheDocument()
    expect(screen.getByText("Child calls: 1")).toBeInTheDocument()
    expect(parentRenderCounter).toHaveBeenCalledTimes(1)
    // only TitleBarComponent re-rendered when title changed
    expect(titleRenderCounter).toHaveBeenCalledTimes(2)
    expect(childRenderCounter).toHaveBeenCalledTimes(1)
  })

  it("prevents drag when clicking minimize button", () => {
    const tile = TileModel.create({ _title: "title", content: {} as any })
    const mockOnMoveTilePointerDown = jest.fn()
    
    render(
      <DndContext>
        <ComponentTitleBar 
          tile={tile} 
          onMoveTilePointerDown={mockOnMoveTilePointerDown}
        />
      </DndContext>
    )
    
    const minimizeButton = screen.getByTestId("component-minimize-button")

    fireEvent.pointerDown(minimizeButton)
    // The drag handler should not be called because stopPropagation prevents bubbling
    expect(mockOnMoveTilePointerDown).not.toHaveBeenCalled()
  })

  it("prevents drag when clicking close button", () => {
    const tile = TileModel.create({ _title: "title", content: {} as any })
    const mockOnMoveTilePointerDown = jest.fn()
    
    render(
      <DndContext>
        <ComponentTitleBar 
          tile={tile} 
          onMoveTilePointerDown={mockOnMoveTilePointerDown}
        />
      </DndContext>
    )
    
    const closeButton = screen.getByTestId("component-close-button")

    fireEvent.pointerDown(closeButton)
    // The drag handler should not be called because stopPropagation prevents bubbling
    expect(mockOnMoveTilePointerDown).not.toHaveBeenCalled()
  })

  it("prevents drag when editing title", () => {
    const tile = TileModel.create({ _title: "title", content: {} as any })
    const mockOnMoveTilePointerDown = jest.fn()

    render(
      <DndContext>
        <ComponentTitleBar
          tile={tile}
          onMoveTilePointerDown={mockOnMoveTilePointerDown}
        />
      </DndContext>
    )

    const titleText = screen.getByTestId("title-text")
    fireEvent.click(titleText)
    const titleInput = screen.getByTestId("title-text-input")
    expect(titleInput).toBeInTheDocument()
    fireEvent.pointerDown(titleInput)
    // The drag handler should not be called because stopPropagation prevents bubbling
    expect(mockOnMoveTilePointerDown).not.toHaveBeenCalled()
  })

  it("only activates title edit mode on click with no drag", () => {
    const tile = TileModel.create({ _title: "title", content: {} as any })
    const mockOnMoveTilePointerDown = jest.fn()

    render(
      <DndContext>
        <ComponentTitleBar
          tile={tile}
          onMoveTilePointerDown={mockOnMoveTilePointerDown}
        />
      </DndContext>
    )

    const titleText = screen.getByTestId("title-text")
    fireEvent.pointerDown(titleText)
    fireEvent.pointerMove(titleText, {clientX: 10, clientY: 10})
    fireEvent.pointerUp(titleText)
    expect(screen.queryByTestId("title-text-input")).not.toBeInTheDocument()

    // Simulate a clean click (pointerDown + pointerUp without movement) to reset the drag state set by the call
    // to pointerMove above. This is necessary here because `fireEvent.click()` does not trigger pointer events like
    // an actual mouse click would.
    fireEvent.pointerDown(titleText)
    fireEvent.pointerUp(titleText)
    fireEvent.click(titleText)
    expect(screen.getByTestId("title-text-input")).toBeInTheDocument()
  })
})
