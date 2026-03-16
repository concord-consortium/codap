import { act, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { createCodapDocument } from "../../models/codap/create-codap-document"
import { IDocumentModel } from "../../models/document/document"
import { persistentState } from "../../models/persistent-state"
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

  describe("keyboard navigation", () => {
    const getToolbarButtons = () => {
      const toolbar = screen.getByRole("toolbar")
      /* eslint-disable testing-library/no-node-access */
      return Array.from(toolbar.querySelectorAll<HTMLElement>("button"))
        .filter(btn => !btn.closest(".tool-shelf-menu-list"))
      /* eslint-enable testing-library/no-node-access */
    }

    it("sets tabIndex 0 on first button and -1 on others", () => {
      renderToolShelf()
      const buttons = getToolbarButtons()
      expect(buttons.length).toBeGreaterThan(1)
      expect(buttons[0]).toHaveAttribute("tabindex", "0")
      buttons.slice(1).forEach((btn: HTMLElement) => {
        expect(btn).toHaveAttribute("tabindex", "-1")
      })
    })

    it("moves focus forward with ArrowRight in horizontal mode", async () => {
      const user = userEvent.setup()
      renderToolShelf()
      const buttons = getToolbarButtons()

      await user.click(buttons[0])
      expect(buttons[0]).toHaveFocus()

      await user.keyboard("{ArrowRight}")
      expect(buttons[1]).toHaveFocus()
      expect(buttons[1]).toHaveAttribute("tabindex", "0")
      expect(buttons[0]).toHaveAttribute("tabindex", "-1")
    })

    it("moves focus backward with ArrowLeft in horizontal mode", async () => {
      const user = userEvent.setup()
      renderToolShelf()
      const buttons = getToolbarButtons()

      // Navigate to second button via ArrowRight so tabindex updates properly
      await user.click(buttons[0])
      await user.keyboard("{ArrowRight}")
      expect(buttons[1]).toHaveFocus()
      expect(buttons[1]).toHaveAttribute("tabindex", "0")

      await user.keyboard("{ArrowLeft}")
      expect(buttons[0]).toHaveFocus()
      expect(buttons[0]).toHaveAttribute("tabindex", "0")
      expect(buttons[1]).toHaveAttribute("tabindex", "-1")
    })

    it("does not wrap at the beginning or end", async () => {
      const user = userEvent.setup()
      renderToolShelf()
      const buttons = getToolbarButtons()
      const lastButton = buttons[buttons.length - 1]

      // At the beginning, ArrowLeft should stay put
      await user.click(buttons[0])
      await user.keyboard("{ArrowLeft}")
      expect(buttons[0]).toHaveFocus()

      // Navigate to the last button via arrow keys
      for (let i = 0; i < buttons.length - 1; i++) {
        await user.keyboard("{ArrowRight}")
      }
      expect(lastButton).toHaveFocus()

      // At the end, ArrowRight should stay put
      await user.keyboard("{ArrowRight}")
      expect(lastButton).toHaveFocus()
    })

    it("can focus disabled buttons via arrow keys", async () => {
      const user = userEvent.setup()
      renderToolShelf()
      const undoButton = screen.getByTestId("tool-shelf-button-undo")
      expect(undoButton).toHaveAttribute("aria-disabled", "true")

      // Navigate to the undo button by arrowing through all buttons
      const buttons = getToolbarButtons()
      const undoIndex = buttons.indexOf(undoButton)
      await user.click(buttons[0])
      for (let i = 0; i < undoIndex; i++) {
        await user.keyboard("{ArrowRight}")
      }
      expect(undoButton).toHaveFocus()
    })

    it("preserves active tabindex across re-renders", async () => {
      const user = userEvent.setup()
      const document = createCodapDocument()
      document.treeMonitor?.enableMonitoring()
      renderToolShelf(document)
      const buttons = getToolbarButtons()

      // Navigate to third button
      await user.click(buttons[0])
      await user.keyboard("{ArrowRight}")
      await user.keyboard("{ArrowRight}")
      expect(buttons[2]).toHaveFocus()
      expect(buttons[2]).toHaveAttribute("tabindex", "0")

      // Trigger a re-render by adding a tile (changes canUndo observable)
      const tile = TileModel.create({ id: "tile-1", content: TestTileContent.create() })
      act(() => document.addTile(tile))

      // Tabindex should still be on the third button after re-render
      expect(buttons[2]).toHaveAttribute("tabindex", "0")
      expect(buttons[0]).toHaveAttribute("tabindex", "-1")

      document.treeMonitor?.disableMonitoring()
    })

    it("navigates with ArrowDown/ArrowUp when toolbar is vertical", async () => {
      const user = userEvent.setup()
      persistentState.setToolbarPosition("Left")
      renderToolShelf()
      const buttons = getToolbarButtons()

      await user.click(buttons[0])
      await user.keyboard("{ArrowDown}")
      expect(buttons[1]).toHaveFocus()

      await user.keyboard("{ArrowUp}")
      expect(buttons[0]).toHaveFocus()

      // ArrowRight should do nothing in vertical mode
      await user.keyboard("{ArrowRight}")
      expect(buttons[0]).toHaveFocus()

      act(() => persistentState.setToolbarPosition("Top"))
    })
  })
})
