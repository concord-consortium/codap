import { act, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import React from "react"
import { createCodapDocument } from "../../models/codap/create-codap-document"
import { IDocumentModel } from "../../models/document/document"
import { TileModel } from "../../models/tiles/tile-model"
import { TestTileContent } from "../../test/test-tile-content"
import { ToolShelf } from "./tool-shelf"

// way to get a writable reference to libDebug
const libDebug = require("../../lib/debug")

// The PluginsButton is tested elsewhere
jest.mock("./plugins-button", () => ({
  PluginsButton: () => null
}))

describe("Tool shelf", () => {

  beforeEach(() => {
    const consoleWarn = console.warn
    jest.spyOn(console, "warn").mockImplementation((...args: any[]) => {
      // ignore the expected warning, but allow others
      if (!`${args[0]}`.startsWith("Unable to load plugin data")) {
        consoleWarn(...args)
      }
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const renderToolShelf = (doc?: IDocumentModel) => {
    const document = doc ?? createCodapDocument()
    render(<ToolShelf document={document}/>)
  }
  it("renders successfully", () => {
    renderToolShelf()
    expect(screen.getByTestId("tool-shelf")).toBeDefined()
  })

  it("renders successfully when DEBUG_UNDO is set", () => {
    libDebug.DEBUG_UNDO = true

    jestSpyConsole("log", spy => {
      renderToolShelf()
      expect(spy).toHaveBeenCalledTimes(2)
    })
    expect(screen.getByTestId("tool-shelf")).toBeDefined()

    libDebug.DEBUG_UNDO = false
  })

  it("undo/redo buttons do nothing when not enabled", async () => {
    const user = userEvent.setup()
    const document = createCodapDocument()
    renderToolShelf(document)
    expect(screen.getByTestId("tool-shelf")).toBeDefined()

    const tile = TileModel.create({ id: "tile-1", content: TestTileContent.create() })
    act(() => document.addTile(tile))
    expect(document.content?.tileMap.size).toBe(1)
    await user.click(screen.getByTestId("tool-shelf-button-undo"))
    expect(document.content?.tileMap.size).toBe(1)
    await user.click(screen.getByTestId("tool-shelf-button-redo"))
    expect(document.content?.tileMap.size).toBe(1)
  })

  it("undo/redo buttons work as expected when enabled", async () => {
    const user = userEvent.setup()
    const document = createCodapDocument()
    renderToolShelf(document)
    expect(screen.getByTestId("tool-shelf")).toBeDefined()

    document.treeMonitor?.enableMonitoring()
    const tile = TileModel.create({ id: "tile-1", content: TestTileContent.create() })
    act(() => document.addTile(tile))
    expect(document.content?.tileMap.size).toBe(1)
    await user.click(screen.getByTestId("tool-shelf-button-undo"))
    expect(document.content?.tileMap.size).toBe(0)
    await user.click(screen.getByTestId("tool-shelf-button-redo"))
    expect(document.content?.tileMap.size).toBe(1)
    document.treeMonitor?.disableMonitoring()
  })
})
