import { DndContext } from "@dnd-kit/core"
import { act, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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
    const tile = TileModel.create({ _title: "title", content: {} })
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
    const tile = TileModel.create({ _title: "title", content: {} })
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
    const tile = TileModel.create({ _title: "title", content: {} })
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
    const tile = TileModel.create({ _title: "title", content: {} })
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

  it("toolbar has correct ARIA attributes", () => {
    const tile = TileModel.create({ _title: "title", content: {} })

    render(
      <DndContext>
        <ComponentTitleBar tile={tile} />
      </DndContext>
    )

    const toolbar = screen.getByRole("toolbar")
    expect(toolbar).toBeInTheDocument()
    expect(toolbar).toHaveAttribute("aria-label", "Tile actions")
  })

  it("arrow keys move focus between toolbar items", async () => {
    const user = userEvent.setup()
    const tile = TileModel.create({ _title: "title", content: {} })

    render(
      <DndContext>
        <ComponentTitleBar tile={tile} />
      </DndContext>
    )

    const titleButton = screen.getByTestId("title-text")
    const minimizeButton = screen.getByTestId("component-minimize-button")
    const closeButton = screen.getByTestId("component-close-button")

    // Title button is the first toolbar item
    act(() => { titleButton.focus() })
    expect(titleButton).toHaveFocus()

    // Arrow right moves to minimize button
    await user.keyboard("{ArrowRight}")
    expect(minimizeButton).toHaveFocus()

    // Arrow right moves to close button
    await user.keyboard("{ArrowRight}")
    expect(closeButton).toHaveFocus()

    // Arrow left moves back to minimize button
    await user.keyboard("{ArrowLeft}")
    expect(minimizeButton).toHaveFocus()
  })

  it("Home and End keys jump to first and last toolbar items", async () => {
    const user = userEvent.setup()
    const tile = TileModel.create({ _title: "title", content: {} })

    render(
      <DndContext>
        <ComponentTitleBar tile={tile} />
      </DndContext>
    )

    const titleButton = screen.getByTestId("title-text")
    const minimizeButton = screen.getByTestId("component-minimize-button")
    const closeButton = screen.getByTestId("component-close-button")

    act(() => { minimizeButton.focus() })
    expect(minimizeButton).toHaveFocus()

    // End key jumps to last item (close button)
    await user.keyboard("{End}")
    expect(closeButton).toHaveFocus()

    // Home key jumps to first item (title button)
    await user.keyboard("{Home}")
    expect(titleButton).toHaveFocus()
  })

  it("toolbar is a single tab stop", async () => {
    const user = userEvent.setup()
    const tile = TileModel.create({ _title: "title", content: {} })

    render(
      <DndContext>
        <ComponentTitleBar tile={tile} />
      </DndContext>
    )

    const titleButton = screen.getByTestId("title-text")
    const minimizeButton = screen.getByTestId("component-minimize-button")
    const closeButton = screen.getByTestId("component-close-button")

    // Only the active roving item (title button) has tabIndex="0"
    expect(titleButton).toHaveAttribute("tabindex", "0")
    expect(minimizeButton).toHaveAttribute("tabindex", "-1")
    expect(closeButton).toHaveAttribute("tabindex", "-1")

    // Tab into the toolbar reaches the active item
    act(() => { titleButton.focus() })
    expect(titleButton).toHaveFocus()

    // Tab again should exit the toolbar (other items have tabIndex="-1" so they're skipped)
    await user.tab()
    expect(titleButton).not.toHaveFocus()
    expect(minimizeButton).not.toHaveFocus()
    expect(closeButton).not.toHaveFocus()
  })

  it("only activates title edit mode on click with no drag", () => {
    const tile = TileModel.create({ _title: "title", content: {} })

    render(
      <DndContext>
        <ComponentTitleBar tile={tile} />
      </DndContext>
    )

    const titleText = screen.getByTestId("title-text")
    fireEvent.pointerDown(titleText)
    fireEvent.pointerMove(titleText, {clientX: 10, clientY: 10})
    fireEvent.pointerUp(titleText)
    expect(screen.queryByTestId("title-text-input")).not.toBeInTheDocument()

    // A subsequent click enters edit mode because handleTitleClick resets hasDraggedRef after each click
    fireEvent.click(titleText)
    expect(screen.getByTestId("title-text-input")).toBeInTheDocument()
  })
})
