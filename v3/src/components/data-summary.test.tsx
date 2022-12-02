import { DndContext } from "@dnd-kit/core"
import { act, render, screen } from "@testing-library/react"
import React from "react"
import { gDataBroker } from "../models/data/data-broker"
import { DataSet, toCanonical } from "../models/data/data-set"
import { DataSummary } from "./data-summary"

describe("DataSummary component", () => {
  it("should render `No data` initially", () => {
    render(<DndContext><DataSummary/></DndContext>)
    expect(screen.getByText("No data")).toBeInTheDocument()
  })

  it("should summarize data once added", () => {
    render(<DndContext><DataSummary broker={gDataBroker}/></DndContext>)
    expect(screen.getByText("No data")).toBeInTheDocument()

    const ds = DataSet.create({ name: "foo" })
    ds.addAttribute({ name: "a" })
    ds.addAttribute({ name: "b" })
    ds.addCases(toCanonical(ds, [{ a: 1, b: 1 }]))
    act(() => {
      gDataBroker.addDataSet(ds)
    })
    expect(screen.queryByText("No data")).not.toBeInTheDocument()
    expect(screen.getByText(`Parsed "foo"`, { exact: false })).toBeInTheDocument()
    expect(screen.getByText("1 case", { exact: false })).toBeInTheDocument()
    expect(screen.getAllByText("a")).toBeTruthy()
    expect(screen.getAllByText("b")).toBeTruthy()
  })
})
