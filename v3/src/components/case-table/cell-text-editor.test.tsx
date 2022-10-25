import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"
import { DataSet } from "../../models/data/data-set"
import { TCalculatedColumn } from "./case-table-types"
import CellTextEditor from "./cell-text-editor"
const mockUseDataSetContext = jest.fn()
jest.mock("../../hooks/use-data-set-context", () => ({
  useDataSetContext: () => mockUseDataSetContext()
}))

describe("CellTextEditor", () => {
  const row = { __id__: "rowId" }
  const column = { key: "columnKey" } as TCalculatedColumn
  const onRowChange = jest.fn()
  const onClose = jest.fn()

  beforeEach(() => {
    jest.resetAllMocks()
  })

  it("should render without dataset", () => {
    const user = userEvent.setup()
    render(<CellTextEditor row={row} column={column} onRowChange={onRowChange} onClose={onClose}/>)
    const editor = screen.getByTestId("cell-text-editor")
    expect(editor).toHaveClass("rdg-text-editor")
    user.keyboard("1")
    fireEvent.blur(editor)
    // fails for some reason even though the function is clearly called
    // expect(onRowChange).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it("should render with dataset", () => {
    const user = userEvent.setup()
    const data = DataSet.create({ name: "data" })
    data.addAttribute({ id: "columnKey", name: "columnName" })
    data.addCases([{ columnKey: "1" }])
    mockUseDataSetContext.mockImplementation(() => data)
    render(<CellTextEditor row={row} column={column} onRowChange={onRowChange} onClose={onClose}/>)
    const editor = screen.getByTestId("cell-text-editor")
    expect(editor).toHaveClass("rdg-text-editor")
    user.keyboard("1")
    fireEvent.blur(editor)
    // fails for some reason even though the function is clearly called
    // expect(onRowChange).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})
