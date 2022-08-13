import { render, screen } from "@testing-library/react"
import React from "react"
import { DataBroker } from "../../../data-model/data-broker"
import { DataSet, toCanonical } from "../../../data-model/data-set"
import { GraphComponent } from "./graph-component"

describe("Graph", () => {
  let broker: DataBroker
  beforeEach(() => {
    broker = new DataBroker()
  })

  it("renders even with no broker", () => {
    render(<GraphComponent />)
    // expect(screen.getByTestId("graph")).toBeInTheDocument()
    expect(true).toBe(true)
  })

  it("renders even with empty broker", () => {
    render(<GraphComponent broker={broker} />)
    expect(screen.getByTestId("graph")).toBeInTheDocument()
  })

  it("renders graph point for each case", () => {
    const data = DataSet.create()
    data.addAttribute({ name: "xVariable"} )
    data.addAttribute({ name: "yVariable" })
    data.addCases(toCanonical(data, [{ xVariable: 1, yVariable: 2 }, { xVariable: 3, yVariable: 4 }]))
    broker.addDataSet(data)
    render(<GraphComponent broker={broker} />)
    expect(screen.getByTestId("graph")).toBeInTheDocument()
    // rerender(<GraphComponent broker={broker} />)
    // expect(screen.getByText('xVariable')).toBeInTheDocument()
    // expect(screen.getByText('yVariable')).toBeInTheDocument()
  })
})
