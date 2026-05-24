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

const mockSetPendingLogMessage = jest.fn()
jest.mock("../../hooks/use-log-context", () => ({
  useLoggingContext: () => ({
    getPendingLogMessage: jest.fn(),
    setPendingLogMessage: mockSetPendingLogMessage
  })
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

  it("should have aria-label with attribute name", () => {
    const data = DataSet.create({ name: "data" }, {historyService: new AppHistoryService()})
    data.addAttribute({ id: "columnKey", name: "Height" })
    data.addCases([{ columnKey: "1" }])
    mockUseDataSetContext.mockImplementation(() => data)
    render(<CellTextEditor row={row} column={column} onRowChange={onRowChange} onClose={onClose}/>)
    const editor = screen.getByTestId("cell-text-editor")
    expect(editor).toHaveAttribute("aria-label")
    expect(editor.getAttribute("aria-label")).toContain("Height")
  })

  it("records a pending log with V2-compatible editValue event format", async () => {
    const data = DataSet.create({ name: "data" }, {historyService: new AppHistoryService()})
    data.addAttribute({ id: "columnKey", name: "columnName" })
    const [caseId] = data.addCases([{ columnKey: "1" }])
    const rowWithRealId = { __id__: caseId }
    mockUseDataSetContext.mockImplementation(() => data)
    const user = userEvent.setup()
    render(<CellTextEditor row={rowWithRealId} column={column} onRowChange={onRowChange} onClose={onClose}/>)
    await user.keyboard("9")
    expect(mockSetPendingLogMessage).toHaveBeenCalled()
    const [, msg] = mockSetPendingLogMessage.mock.calls[mockSetPendingLogMessage.mock.calls.length - 1]
    expect(msg.message).toMatch(/^editValue: \{ collection:/)
    expect(msg.args).toEqual(expect.objectContaining({
      collection: expect.any(String),
      case: caseId,
      attribute: "columnKey",
      old: "1",
      new: "9"
    }))
  })
})
