import React from "react"
import { userEvent } from '@testing-library/user-event'
import { ToolShelf } from "./tool-shelf"
import { render, screen } from "@testing-library/react"
import { DocumentContext } from "../../hooks/use-document-context"
import { createCodapDocument } from "../../models/codap/create-codap-document"

// way to get a writable reference to libDebug
const libDebug = require("../../lib/debug")

describe("Tool shelf", () => {
  const renderToolShelf = () => {
    const document = createCodapDocument();
    render(
      <DocumentContext.Provider value={document}>
        <ToolShelf />
      </DocumentContext.Provider>
    )
    return document
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
    const document = renderToolShelf()
    expect(screen.getByTestId("tool-shelf")).toBeDefined()

    document.setTitle("New Title")
    await user.click(screen.getByTestId("tool-shelf-button-Undo"))
    expect(document.title).toBe("New Title")
    await user.click(screen.getByTestId("tool-shelf-button-Redo"))
    expect(document.title).toBe("New Title")
  })

  it("undo/redo buttons work as expected when enabled", async () => {
    const user = userEvent.setup()
    const document = renderToolShelf()
    expect(screen.getByTestId("tool-shelf")).toBeDefined()

    document.treeMonitor?.enableMonitoring()
    document.setTitle("New Title")
    await user.click(screen.getByTestId("tool-shelf-button-Undo"))
    expect(document.title).toBeUndefined()
    await user.click(screen.getByTestId("tool-shelf-button-Redo"))
    expect(document.title).toBe("New Title")
    document.treeMonitor?.disableMonitoring()
  })
})
