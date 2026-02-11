import { renderHook } from "@testing-library/react"
import { DataSetContext } from "../../hooks/use-data-set-context"
import { DataSet } from "../../models/data/data-set"
import { TCalculatedColumn, TColumn, TRow } from "./case-table-types"
import { useSelectedCell } from "./use-selected-cell"
import { uiState } from "../../models/ui-state"

jest.mock("../../utilities/plugin-utils", () => ({
  blockAPIRequestsWhileEditing: () => true
}))

const mockScrollRowIntoView = jest.fn()
jest.mock("./use-collection-table-model", () => ({
  useCollectionTableModel: () => ({
    scrollRowIntoView: (...args: any[]) => mockScrollRowIntoView(...args)
  })
}))

describe("useSelectedCell", () => {
  const gridRef = {
    current: {
      selectCell: jest.fn()
    }
  } as any
  let columns: TColumn[] = []
  let rows: TRow[] = []

  const data = DataSet.create({ name: "Data" })

  beforeEach(() => {
    jest.useFakeTimers()
    gridRef.current.selectCell.mockReset()
    mockScrollRowIntoView.mockReset()
    columns = []
    rows = []
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("renders the hook correctly with an empty table", () => {
    const { result } =
      renderHook(() => useSelectedCell(gridRef, columns, rows), {
        wrapper: ({ children }) => (
          <DataSetContext.Provider value={data}>
            {children}
          </DataSetContext.Provider>
        )
      })

    const { selectedCell, handleSelectedCellChange, navigateToNextRow } = result.current
    expect(selectedCell).toBeUndefined()
    expect(handleSelectedCellChange).toBeDefined()
    expect(navigateToNextRow).toBeDefined()
  })

  it("renders the hook correctly with a simple table", () => {
    columns = [{
      name: "Column1",
      key: "column-1"
    }]
    rows = [
      { __id__: "row-0" },
      { __id__: "row-1" },
      { __id__: "row-2" }
    ]
    const { rerender, result } =
      renderHook(() => useSelectedCell(gridRef, columns, rows), {
        wrapper: ({ children }) => (
          <DataSetContext.Provider value={data}>
            {children}
          </DataSetContext.Provider>
        )
      })

    let { selectedCell, handleSelectedCellChange, navigateToNextRow } = result.current
    expect(selectedCell).toBeUndefined()
    expect(handleSelectedCellChange).toBeDefined()
    expect(navigateToNextRow).toBeDefined()

    // select a cell
    handleSelectedCellChange({ rowIdx: 0, row: rows[0], column: columns[0] as TCalculatedColumn })
    rerender(() => useSelectedCell(gridRef, columns, rows))
    selectedCell = result.current.selectedCell
    expect(selectedCell).toEqual({
      columnId: "column-1",
      rowId: "row-0",
      rowIdx: 0
    })
    // navigate to next row
    navigateToNextRow = result.current.navigateToNextRow
    navigateToNextRow()
    jest.runAllTimers()
    expect(gridRef.current.selectCell).toHaveBeenCalledTimes(1)
    expect(mockScrollRowIntoView).toHaveBeenCalledTimes(1)
    // simulate processing of a batch of requests
    uiState.incrementInterruptionCount()
    jest.runAllTimers()
    expect(mockScrollRowIntoView).toHaveBeenCalledTimes(2)
  })

  it("defers navigation via useEffect when target row doesn't exist yet", () => {
    columns = [
      { name: "Index", key: "__index__" },
      { name: "Column1", key: "column-1" }
    ]
    rows = [
      { __id__: "row-0" },
      { __id__: "input-row" }
    ]
    const { rerender, result } =
      renderHook(() => useSelectedCell(gridRef, columns, rows), {
        wrapper: ({ children }) => (
          <DataSetContext.Provider value={data}>
            {children}
          </DataSetContext.Provider>
        )
      })

    // select the input row cell
    const { handleSelectedCellChange, navigateToNextRow } = result.current
    handleSelectedCellChange({
      rowIdx: 1, row: rows[1], column: columns[1] as TCalculatedColumn
    })

    // navigate to next row — target rowIdx 2 doesn't exist yet (only 2 rows: 0, 1)
    navigateToNextRow()
    jest.runAllTimers()
    // setTimeout should NOT have navigated because row 2 is out of bounds
    expect(gridRef.current.selectCell).not.toHaveBeenCalled()
    expect(mockScrollRowIntoView).not.toHaveBeenCalled()

    // simulate grid re-rendering with the new case row + input row
    rows = [
      { __id__: "row-0" },
      { __id__: "row-1" },
      { __id__: "input-row" }
    ]
    rerender()

    // useEffect should have retried and succeeded now that row 2 exists
    expect(gridRef.current.selectCell).toHaveBeenCalledTimes(1)
    expect(gridRef.current.selectCell).toHaveBeenCalledWith({ idx: 1, rowIdx: 2 }, true)
    expect(mockScrollRowIntoView).toHaveBeenCalledWith(2)
  })
})
