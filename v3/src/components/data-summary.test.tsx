import { render, screen } from "@testing-library/react"
import React from "react"
import { gDataBroker } from "../data-model/data-broker"
import { DataSet, toCanonical } from "../data-model/data-set"
import { DataSummary } from "./data-summary"

describe("DataSummary component", () => {
  it("should render `No data` initially", () => {
    render(<DataSummary/>)
    expect(screen.getByText("No data")).toBeInTheDocument()
  })

  it("should summarize data once added", () => {
    render(<DataSummary broker={gDataBroker}/>)
    expect(screen.getByText("No data")).toBeInTheDocument()

    const ds = DataSet.create({ name: "foo" })
    ds.addAttribute({ name: "a" })
    ds.addAttribute({ name: "b" })
    ds.addCases(toCanonical(ds, [{ a: 1, b: 1 }]))
    gDataBroker.addDataSet(ds)
    expect(screen.queryByText("No data")).not.toBeInTheDocument()
    expect(screen.getByText(`Parsed "foo"`, { exact: false })).toBeInTheDocument()
    expect(screen.getByText("1 case(s)", { exact: false })).toBeInTheDocument()
    expect(screen.getAllByText("a")).toBeTruthy()
    expect(screen.getAllByText("b")).toBeTruthy()
  })
})
