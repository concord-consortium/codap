import React from "react"
import { ToolShelf } from "./tool-shelf"
import { render, screen } from "@testing-library/react"
import { DocumentContentModel } from "../../models/document/document-content"

describe("Tool shelf", () => {
  it("renders successfully", () => {
    const content = DocumentContentModel.create()
    render(<ToolShelf content={content}/>)
    expect(screen.getByTestId("tool-shelf")).toBeDefined()
  })
})
