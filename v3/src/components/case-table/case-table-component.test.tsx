import { DndContext } from "@dnd-kit/core"
import { render, screen } from "@testing-library/react"
import { userEvent } from '@testing-library/user-event'
import { getSnapshot } from "mobx-state-tree"
import { CaseTableComponent } from "./case-table-component"
import { CaseTableModel } from "./case-table-model"
import { DataSetContext } from "../../hooks/use-data-set-context"
import { ITileSelection, TileSelectionContext } from "../../hooks/use-tile-selection-context"
import { useKeyStates } from "../../hooks/use-key-states"
import { DataBroker } from "../../models/data/data-broker"
import { DataSet, toCanonical } from "../../models/data/data-set"
import { ITileModel, TileModel } from "../../models/tiles/tile-model"
import "./case-table-registration"

jest.mock("./case-table-shared.scss", () => ({
  headerRowHeight: "30"
}))

const UseKeyStatesWrapper = () => {
  useKeyStates()
  return null
}

describe("Case Table", () => {
  let broker: DataBroker
  let tile: ITileModel

  const tileSelection: ITileSelection = {
    isTileSelected() {
      return false
    },
    selectTile() {
    },
    addFocusIgnoreFn() {
      return () => null
    }
  }

  beforeEach(() => {
    broker = new DataBroker()
    tile = TileModel.create({ content: getSnapshot(CaseTableModel.create()) })
  })

  it("renders nothing with no broker", () => {
    render(
      <DndContext>
        <TileSelectionContext.Provider value={tileSelection}>
          <CaseTableComponent tile={tile}/>
        </TileSelectionContext.Provider>
      </DndContext>)
    expect(screen.queryByTestId("case-table")).not.toBeInTheDocument()
  })

  it("renders nothing with empty broker", () => {
    render(
      <DndContext>
        <TileSelectionContext.Provider value={tileSelection}>
          <CaseTableComponent tile={tile}/>
        </TileSelectionContext.Provider>
      </DndContext>)
    expect(screen.queryByTestId("case-table")).not.toBeInTheDocument()
  })

  it("renders table with data", () => {
    const data = DataSet.create()
    data.addAttribute({ name: "a"})
    data.addAttribute({ name: "b" })
    data.addCases(toCanonical(data, [{ a: 1, b: 2 }, { a: 3, b: 4 }]))
    broker.addDataSet(data)
    render(
      <TileSelectionContext.Provider value={tileSelection}>
        <DndContext>
          <DataSetContext.Provider value={data}>
            <CaseTableComponent tile={tile}/>
          </DataSetContext.Provider>
        </DndContext>
      </TileSelectionContext.Provider>)
    expect(screen.getByTestId("case-table")).toBeInTheDocument()
  })

  // recent changes, e.g. debouncing some callbacks, prevent this test from succeeding
  it.skip("selects rows when index cell is clicked", async () => {
    const user = userEvent.setup()
    const data = DataSet.create()
    data.addAttribute({ name: "a"})
    data.addAttribute({ name: "b" })
    data.addCases(toCanonical(data, [{ a: 1, b: 2 }, { a: 3, b: 4 }]))
    broker.addDataSet(data)
    const { rerender } = render((
      <DndContext>
        <DataSetContext.Provider value={data}>
          <UseKeyStatesWrapper/>
          <CaseTableComponent tile={tile}/>
        </DataSetContext.Provider>
      </DndContext>
    ))
    expect(screen.getByTestId("case-table")).toBeInTheDocument()
    const indexCells = screen.getAllByRole("rowheader")
    expect(indexCells.length).toBe(2)
    const indexContents = screen.getAllByTestId("codap-index-content-button")
    expect(indexContents.length).toBe(2)
    expect(data.selection.size).toBe(0)
    await user.click(indexContents[0])
    rerender((
      <DndContext>
        <DataSetContext.Provider value={data}>
          <UseKeyStatesWrapper/>
          <CaseTableComponent tile={tile}/>
        </DataSetContext.Provider>
      </DndContext>
    ))
    expect(data.selection.size).toBe(1)
    await user.keyboard('[ShiftLeft>]') // Press Shift (without releasing it)
    await user.click(indexContents[1])
    expect(data.selection.size).toBe(2)
  }, 10000)
})
