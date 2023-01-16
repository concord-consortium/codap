import { DndContext } from "@dnd-kit/core"
import { render, screen } from "@testing-library/react"
import userEvent from '@testing-library/user-event'
import { getSnapshot } from "mobx-state-tree"
import React from "react"
import { CaseTableComponent } from "./case-table-component"
import { kCaseTableTileType } from "./case-table-defs"
import { CaseTableModel } from "./case-table-model"
import { DataSetContext } from "../../hooks/use-data-set-context"
import { useKeyStates } from "../../hooks/use-key-states"
import { DataBroker } from "../../models/data/data-broker"
import { DataSet, toCanonical } from "../../models/data/data-set"
import { ITileModel, TileModel } from "../../models/tiles/tile-model"
import { registerTileTypes } from "../../register-tile-types"

jest.mock("./case-table-shared.scss", () => ({
  headerRowHeight: "30",
  bodyRowHeight: "18"
}))

const UseKeyStatesWrapper = () => {
  useKeyStates()
  return null
}

describe("Case Table", () => {
  registerTileTypes([kCaseTableTileType])

  let broker: DataBroker
  let tile: ITileModel
  beforeEach(() => {
    broker = new DataBroker()
    tile = TileModel.create({ content: getSnapshot(CaseTableModel.create()) })
  })

  it("renders nothing with no broker", () => {
    render(<DndContext><CaseTableComponent tile={tile}/></DndContext>)
    expect(screen.queryByTestId("case-table")).not.toBeInTheDocument()
  })

  it("renders nothing with empty broker", () => {
    render(<DndContext><CaseTableComponent tile={tile}/></DndContext>)
    expect(screen.queryByTestId("case-table")).not.toBeInTheDocument()
  })

  it("renders table with data", () => {
    const data = DataSet.create()
    data.addAttribute({ name: "a"})
    data.addAttribute({ name: "b" })
    data.addCases(toCanonical(data, [{ a: 1, b: 2 }, { a: 3, b: 4 }]))
    broker.addDataSet(data)
    render(
      <DndContext>
        <DataSetContext.Provider value={data}>
          <CaseTableComponent tile={tile}/>
        </DataSetContext.Provider>
      </DndContext>)
    expect(screen.getByTestId("case-table")).toBeInTheDocument()
  })

  it("selects rows when index cell is clicked", async () => {
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
  })
})
