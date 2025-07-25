import { DndContext } from "@dnd-kit/core"
import React from "react"
import { act, render, screen } from "@testing-library/react"
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
})
