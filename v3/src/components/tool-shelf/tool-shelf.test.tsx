import React from "react"
import { userEvent } from '@testing-library/user-event'
import { ToolShelf } from "./tool-shelf"
import { render, screen } from "@testing-library/react"
import { DocumentContext } from "../../hooks/use-document-context"
import { createCodapDocument } from "../../models/codap/create-codap-document"
import { IDocumentModel } from "../../models/document/document"

// way to get a writable reference to libDebug
const libDebug = require("../../lib/debug")

describe("Tool shelf", () => {
  const renderToolShelf = (doc?: IDocumentModel) => {
    const codapDocument = doc ?? createCodapDocument()
    render(
      <DocumentContext.Provider value={codapDocument}>
        <ToolShelf />
      </DocumentContext.Provider>
    )
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
    const codapDocument = createCodapDocument()
    renderToolShelf(codapDocument)
    expect(screen.getByTestId("tool-shelf")).toBeDefined()

    codapDocument.setTitle("New Title")
    await user.click(screen.getByTestId("tool-shelf-button-undo"))
    expect(codapDocument.title).toBe("New Title")
    await user.click(screen.getByTestId("tool-shelf-button-redo"))
    expect(codapDocument.title).toBe("New Title")
  })

  it("undo/redo buttons work as expected when enabled", async () => {
    const user = userEvent.setup()
    const codapDocument = createCodapDocument()
    renderToolShelf(codapDocument)
    expect(screen.getByTestId("tool-shelf")).toBeDefined()

    codapDocument.treeMonitor?.enableMonitoring()
    codapDocument.setTitle("New Title")
    await user.click(screen.getByTestId("tool-shelf-button-undo"))
    expect(codapDocument.title).toBeUndefined()
    await user.click(screen.getByTestId("tool-shelf-button-redo"))
    expect(codapDocument.title).toBe("New Title")
    codapDocument.treeMonitor?.disableMonitoring()
  })
})
