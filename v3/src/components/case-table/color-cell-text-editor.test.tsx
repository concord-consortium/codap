import { render } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { appState } from "../../models/app-state"
import { createDefaultTileOfType } from "../../models/codap/add-default-content"
import { DataSet } from "../../models/data/data-set"
import { AppHistoryService } from "../../models/history/app-history-service"
import { uiState } from "../../models/ui-state"
import { kWebViewTileType } from "../web-view/web-view-defs"
import { IWebViewModel } from "../web-view/web-view-model"
import "../web-view/web-view-registration"
import { TCalculatedColumn } from "./case-table-types"
import ColorCellTextEditor from "./color-cell-text-editor"

const mockUseDataSetContext = jest.fn()
jest.mock("../../hooks/use-data-set-context", () => ({
  useDataSetContext: () => mockUseDataSetContext()
}))

jest.mock("../../hooks/use-log-context", () => ({
  useLoggingContext: () => ({
    getPendingLogMessage: jest.fn(),
    setPendingLogMessage: jest.fn()
  })
}))

describe("ColorCellTextEditor", () => {
  const column = { key: "columnKey" } as TCalculatedColumn

  it("holds the managing plugin's requests once the user changes the value", async () => {
    const { content } = appState.document
    const tile = createDefaultTileOfType(kWebViewTileType)!
    content?.insertTileInDefaultRow(tile)
    ;(tile.content as IWebViewModel).setBlockAPIRequestsWhileEditing(true)
    const data = DataSet.create({ name: "data" }, { historyService: new AppHistoryService() })
    data.addAttribute({ id: "columnKey", name: "columnName" })
    const [caseId] = data.addCases([{ columnKey: "1" }])
    data.setManagingControllerId(tile.id)
    mockUseDataSetContext.mockImplementation(() => data)
    const user = userEvent.setup()
    const { unmount } = render(
      <ColorCellTextEditor row={{ __id__: caseId }} column={column} onRowChange={jest.fn()} onClose={jest.fn()}/>)
    expect(uiState.isEditingBlockingRequestsFrom(tile.id)).toBe(false)
    await user.keyboard("9")
    expect(uiState.isEditingBlockingRequestsFrom(tile.id)).toBe(true)
    unmount()
    expect(uiState.isEditingBlockingRequestsFrom(tile.id)).toBe(false)
    content?.deleteTile(tile.id)
  })
})
