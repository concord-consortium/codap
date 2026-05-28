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
const mockModelState: { rows: TRow[] } = { rows: [] }
jest.mock("./use-collection-table-model", () => ({
  useCollectionTableModel: () => ({
    scrollRowIntoView: (...args: any[]) => mockScrollRowIntoView(...args),
    get rows() { return mockModelState.rows }
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
    mockModelState.rows = []
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

  it("navigateToNextRow invokes selectCell synchronously (no setTimeout)", () => {
    // Regression guard for CODAP-1225: navigateToNextRow must move selection
    // synchronously so a keystroke between Enter and the selection move cannot
    // enter edit mode on the old cell.
    columns = [{ name: "Column1", key: "column-1" }]
    rows = [{ __id__: "row-0" }, { __id__: "row-1" }, { __id__: "row-2" }]
    const { result } =
      renderHook(() => useSelectedCell(gridRef, columns, rows), {
        wrapper: ({ children }) => (
          <DataSetContext.Provider value={data}>
            {children}
          </DataSetContext.Provider>
        )
      })
    result.current.handleSelectedCellChange({
      rowIdx: 0, row: rows[0], column: columns[0] as TCalculatedColumn
    })

    result.current.navigateToNextRow()

    // Assert selectCell was called BEFORE any timers ran — i.e. synchronously.
    expect(gridRef.current.selectCell).toHaveBeenCalledTimes(1)
    expect(gridRef.current.selectCell).toHaveBeenCalledWith({ idx: 0, rowIdx: 1 }, true)
    expect(mockScrollRowIntoView).toHaveBeenCalledWith(1)

    // Also guard against a regression that reintroduces setTimeout *alongside*
    // the sync call: flushing pending timers must not trigger a second navigation.
    jest.runAllTimers()
    expect(gridRef.current.selectCell).toHaveBeenCalledTimes(1)
  })

  it("navigateToNextCell invokes selectCell synchronously (no setTimeout)", () => {
    // Regression guard for CODAP-1225 (Tab variant): navigateToNextCell must
    // move selection synchronously for the same reason as navigateToNextRow.
    columns = [
      { name: "Index", key: "__index__" },
      { name: "Column1", key: "column-1", renderEditCell: () => null },
      { name: "Column2", key: "column-2", renderEditCell: () => null }
    ]
    rows = [{ __id__: "row-0" }, { __id__: "row-1" }]
    const { result } =
      renderHook(() => useSelectedCell(gridRef, columns, rows), {
        wrapper: ({ children }) => (
          <DataSetContext.Provider value={data}>
            {children}
          </DataSetContext.Provider>
        )
      })
    result.current.handleSelectedCellChange({
      rowIdx: 0, row: rows[0], column: columns[1] as TCalculatedColumn
    })

    result.current.navigateToNextCell()

    expect(gridRef.current.selectCell).toHaveBeenCalledTimes(1)
    expect(gridRef.current.selectCell).toHaveBeenCalledWith({ idx: 2, rowIdx: 0 }, true)

    // Flushing pending timers must not trigger a second navigation — guards
    // against a reintroduced setTimeout alongside the sync call.
    jest.runAllTimers()
    expect(gridRef.current.selectCell).toHaveBeenCalledTimes(1)
  })

  it("navigateToNextCell with { enterEdit: false } lands the target cell in SELECT mode", () => {
    columns = [
      { name: "Index", key: "__index__" },
      { name: "a", key: "a", renderEditCell: () => null },
      { name: "b", key: "b", renderEditCell: () => null }
    ]
    rows = [{ __id__: "row-0" }]
    const { result } =
      renderHook(() => useSelectedCell(gridRef, columns, rows), {
        wrapper: ({ children }) => (
          <DataSetContext.Provider value={data}>{children}</DataSetContext.Provider>
        )
      })
    result.current.handleSelectedCellChange({
      rowIdx: 0, row: rows[0], column: columns[1] as TCalculatedColumn
    })

    result.current.navigateToNextCell(false, { enterEdit: false })

    expect(gridRef.current.selectCell).toHaveBeenCalledWith({ idx: 2, rowIdx: 0 }, false)
  })

  it("navigateToNextCell skips non-editable columns when stepping right", () => {
    // Formula attribute between two editable attributes.
    columns = [
      { name: "Index", key: "__index__" },
      { name: "a", key: "a", renderEditCell: () => null },
      { name: "f", key: "f" },
      { name: "b", key: "b", renderEditCell: () => null }
    ]
    rows = [{ __id__: "row-0" }]
    const { result } =
      renderHook(() => useSelectedCell(gridRef, columns, rows), {
        wrapper: ({ children }) => (
          <DataSetContext.Provider value={data}>{children}</DataSetContext.Provider>
        )
      })
    result.current.handleSelectedCellChange({
      rowIdx: 0, row: rows[0], column: columns[1] as TCalculatedColumn
    })

    result.current.navigateToNextCell()

    // Should skip "f" (no renderEditCell) and land on "b" at idx 3.
    expect(gridRef.current.selectCell).toHaveBeenCalledWith({ idx: 3, rowIdx: 0 }, true)
  })

  it("navigateToNextCell skips non-editable columns when stepping left", () => {
    columns = [
      { name: "Index", key: "__index__" },
      { name: "a", key: "a", renderEditCell: () => null },
      { name: "f", key: "f" },
      { name: "b", key: "b", renderEditCell: () => null }
    ]
    rows = [{ __id__: "row-0" }]
    const { result } =
      renderHook(() => useSelectedCell(gridRef, columns, rows), {
        wrapper: ({ children }) => (
          <DataSetContext.Provider value={data}>{children}</DataSetContext.Provider>
        )
      })
    result.current.handleSelectedCellChange({
      rowIdx: 0, row: rows[0], column: columns[3] as TCalculatedColumn
    })

    result.current.navigateToNextCell(true)

    // Should skip "f" and land on "a" at idx 1.
    expect(gridRef.current.selectCell).toHaveBeenCalledWith({ idx: 1, rowIdx: 0 }, true)
  })

  it("navigateToNextCell wraps Tab at end of row to first editable cell of next row", () => {
    columns = [
      { name: "Index", key: "__index__" },
      { name: "a", key: "a", renderEditCell: () => null },
      { name: "b", key: "b", renderEditCell: () => null }
    ]
    rows = [{ __id__: "row-0" }, { __id__: "row-1" }]
    const { result } =
      renderHook(() => useSelectedCell(gridRef, columns, rows), {
        wrapper: ({ children }) => (
          <DataSetContext.Provider value={data}>{children}</DataSetContext.Provider>
        )
      })
    result.current.handleSelectedCellChange({
      rowIdx: 0, row: rows[0], column: columns[2] as TCalculatedColumn
    })

    result.current.navigateToNextCell()

    // From last column of row 0, Tab wraps to first editable (idx 1) of row 1.
    expect(gridRef.current.selectCell).toHaveBeenCalledWith({ idx: 1, rowIdx: 1 }, true)
  })

  it("navigateToNextCell wraps Shift-Tab at start of row to last editable cell of previous row", () => {
    columns = [
      { name: "Index", key: "__index__" },
      { name: "a", key: "a", renderEditCell: () => null },
      { name: "b", key: "b", renderEditCell: () => null }
    ]
    rows = [{ __id__: "row-0" }, { __id__: "row-1" }]
    const { result } =
      renderHook(() => useSelectedCell(gridRef, columns, rows), {
        wrapper: ({ children }) => (
          <DataSetContext.Provider value={data}>{children}</DataSetContext.Provider>
        )
      })
    result.current.handleSelectedCellChange({
      rowIdx: 1, row: rows[1], column: columns[1] as TCalculatedColumn
    })

    result.current.navigateToNextCell(true)

    // From first editable column of row 1, Shift-Tab wraps to last editable (idx 2) of row 0.
    expect(gridRef.current.selectCell).toHaveBeenCalledWith({ idx: 2, rowIdx: 0 }, true)
  })

  it("navigateToNextCell does nothing at the top-left editable cell on Shift-Tab", () => {
    columns = [
      { name: "Index", key: "__index__" },
      { name: "a", key: "a", renderEditCell: () => null },
      { name: "b", key: "b", renderEditCell: () => null }
    ]
    rows = [{ __id__: "row-0" }]
    const { result } =
      renderHook(() => useSelectedCell(gridRef, columns, rows), {
        wrapper: ({ children }) => (
          <DataSetContext.Provider value={data}>{children}</DataSetContext.Provider>
        )
      })
    result.current.handleSelectedCellChange({
      rowIdx: 0, row: rows[0], column: columns[1] as TCalculatedColumn
    })

    result.current.navigateToNextCell(true)

    expect(gridRef.current.selectCell).not.toHaveBeenCalled()
  })

  it("navigateToFirstEditableInRow / navigateToLastEditableInRow target the row's editable extremes", () => {
    columns = [
      { name: "Index", key: "__index__" },
      { name: "a", key: "a", renderEditCell: () => null },
      { name: "f", key: "f" },
      { name: "b", key: "b", renderEditCell: () => null }
    ]
    rows = [{ __id__: "row-0" }, { __id__: "row-1" }]
    const { result } =
      renderHook(() => useSelectedCell(gridRef, columns, rows), {
        wrapper: ({ children }) => (
          <DataSetContext.Provider value={data}>{children}</DataSetContext.Provider>
        )
      })

    result.current.navigateToFirstEditableInRow(1)
    expect(gridRef.current.selectCell).toHaveBeenLastCalledWith({ idx: 1, rowIdx: 1 }, false)

    result.current.navigateToLastEditableInRow(1)
    expect(gridRef.current.selectCell).toHaveBeenLastCalledWith({ idx: 3, rowIdx: 1 }, false)
  })

  it("navigateToLastEditableCell skips the input row", () => {
    columns = [
      { name: "Index", key: "__index__" },
      { name: "a", key: "a", renderEditCell: () => null }
    ]
    // collectionTableModel.rows holds data rows only (no input row); the React
    // `rows` passed to the hook has the input row appended at the end.
    mockModelState.rows = [{ __id__: "row-0" }, { __id__: "row-1" }]
    rows = [
      { __id__: "row-0" },
      { __id__: "row-1" },
      { __id__: "__input__" }
    ]
    const { result } =
      renderHook(() => useSelectedCell(gridRef, columns, rows), {
        wrapper: ({ children }) => (
          <DataSetContext.Provider value={data}>{children}</DataSetContext.Provider>
        )
      })

    result.current.navigateToLastEditableCell()

    // Two data rows + input row → last data row is rowIdx 1.
    expect(gridRef.current.selectCell).toHaveBeenLastCalledWith({ idx: 1, rowIdx: 1 }, false)
  })

  it("defers navigation via useEffect when target row doesn't exist yet", () => {
    columns = [
      { name: "Index", key: "__index__" },
      { name: "Column1", key: "column-1", renderEditCell: () => null }
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
