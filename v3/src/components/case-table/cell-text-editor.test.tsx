import { fireEvent, render, screen } from "@testing-library/react"
import { userEvent } from '@testing-library/user-event'
import { DataSet } from "../../models/data/data-set"
import { TCalculatedColumn } from "./case-table-types"
import CellTextEditor from "./cell-text-editor"
import { AppHistoryService } from "../../models/history/app-history-service"
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

  it("should render without dataset", async () => {
    const user = userEvent.setup()
    render(<CellTextEditor row={row} column={column} onRowChange={onRowChange} onClose={onClose}/>)
    const editor = screen.getByTestId("cell-text-editor")
    expect(editor).toHaveClass("rdg-text-editor")
    await user.keyboard("1")
    fireEvent.blur(editor)
    expect(onRowChange).toHaveBeenCalled()
  })

  it("should render with dataset", async () => {
    const user = userEvent.setup()
    const data = DataSet.create({ name: "data" }, {historyService: new AppHistoryService()})
    data.addAttribute({ id: "columnKey", name: "columnName" })
    data.addCases([{ columnKey: "1" }])
    mockUseDataSetContext.mockImplementation(() => data)
    render(<CellTextEditor row={row} column={column} onRowChange={onRowChange} onClose={onClose}/>)
    const editor = screen.getByTestId("cell-text-editor")
    expect(editor).toHaveClass("rdg-text-editor")
    await user.keyboard("1")
    fireEvent.blur(editor)
    expect(onRowChange).toHaveBeenCalled()
  })
})
