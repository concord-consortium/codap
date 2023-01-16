import { DndContext } from "@dnd-kit/core"
import { act, render, screen } from "@testing-library/react"
import { getSnapshot } from "mobx-state-tree"
import React from "react"
import { DataSetContext } from "../../hooks/use-data-set-context"
import { gDataBroker } from "../../models/data/data-broker"
import { DataSet, toCanonical } from "../../models/data/data-set"
import { TileModel } from "../../models/tiles/tile-model"
import { registerTileTypes } from "../../register-tile-types"
import { DataSummary } from "./data-summary"
import { kDataSummaryTileType } from "./data-summary-defs"
import { DataSummaryModel } from "./data-summary-model"

describe("DataSummary component", () => {
  registerTileTypes([kDataSummaryTileType])

  const tile = TileModel.create({ content: getSnapshot(DataSummaryModel.create()) })

  it("should render `No data` initially", () => {
    render(
      <DndContext>
        <DataSummary tile={tile}/>
      </DndContext>
    )
    expect(screen.getByText("No data")).toBeInTheDocument()
  })

  it("should summarize data once added", () => {
    const { rerender } = render(
      <DndContext>
        <DataSummary tile={tile}/>
      </DndContext>
    )
    expect(screen.getByText("No data")).toBeInTheDocument()

    const ds = DataSet.create({ name: "foo" })
    ds.addAttribute({ name: "a" })
    ds.addAttribute({ name: "b" })
    ds.addCases(toCanonical(ds, [{ a: 1, b: 1 }]))
    act(() => {
      gDataBroker.addDataSet(ds)
    })
    rerender(
      <DndContext>
        <DataSetContext.Provider value={ds}>
          <DataSummary tile={tile}/>
        </DataSetContext.Provider>
      </DndContext>
    )
    expect(screen.queryByText("No data")).not.toBeInTheDocument()
    expect(screen.getByText(`Parsed "foo"`, { exact: false })).toBeInTheDocument()
    expect(screen.getByText("1 case", { exact: false })).toBeInTheDocument()
    expect(screen.getAllByText("a")).toBeTruthy()
    expect(screen.getAllByText("b")).toBeTruthy()
  })
})
