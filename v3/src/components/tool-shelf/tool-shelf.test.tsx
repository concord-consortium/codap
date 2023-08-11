import React from "react"
import { ToolShelf } from "./tool-shelf"
import { render, screen } from "@testing-library/react"
import { createCodapDocument } from "../../models/codap/create-codap-document"

describe("Tool shelf", () => {
  it("renders successfully", () => {
    const document = createCodapDocument()
    render(<ToolShelf document={document}/>)
    expect(screen.getByTestId("tool-shelf")).toBeDefined()
  })
})
