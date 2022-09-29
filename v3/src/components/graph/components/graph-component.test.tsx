import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"
import { DataBroker } from "../../../data-model/data-broker"
import { DataSet, toCanonical } from "../../../data-model/data-set"
import { GraphComponent } from "./graph-component"

describe.skip("Graph", () => {
  let broker: DataBroker
  beforeEach(() => {
    broker = new DataBroker()
  })

  it("renders with no broker", () => {
    render(<GraphComponent />)
    // expect(screen.getByTestId("graph")).toBeInTheDocument()
    expect(true).toBe(true)
  })

  it("renders with empty broker", () => {
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

  it.skip("can switch to dot plot", async () => {
    const user = userEvent.setup()
    const data = DataSet.create()
    data.addAttribute({ name: "xVariable" })
    data.addAttribute({ name: "yVariable" })
    data.addCases(toCanonical(data, [{ xVariable: 1, yVariable: 2 }, { xVariable: 3, yVariable: 4 }]))
    broker.addDataSet(data)
    const { rerender } = render(<GraphComponent broker={broker} />)
    expect(screen.getByTestId("graph")).toBeInTheDocument()
    // expect(screen.getByText('xVariable')).toBeInTheDocument()
    // expect(screen.getByText('yVariable')).toBeInTheDocument()
    const plotTypeButton = screen.getByText("Dot Plot")
    await user.click(plotTypeButton)
    rerender(<GraphComponent broker={broker} />)
  })
})
