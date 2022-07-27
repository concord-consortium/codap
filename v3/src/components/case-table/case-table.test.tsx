import { render, screen } from "@testing-library/react"
import React from "react"
import { DataBroker } from "../../data-model/data-broker"
import { DataSet, toCanonical } from "../../data-model/data-set"
import { CaseTable } from "./case-table"

// used by case table
jest.mock("../../hooks/use-measure-text", () => ({
  measureText: (text: string) => text.length * 6
}))

describe("Case Table", () => {
  let broker: DataBroker
  beforeEach(() => {
    broker = new DataBroker()
  })

  it("renders nothing with no broker", () => {
    render(<CaseTable />)
    expect(screen.queryByTestId("case-table")).not.toBeInTheDocument()
  })

  it("renders nothing with empty broker", () => {
    render(<CaseTable broker={broker} />)
    expect(screen.queryByTestId("case-table")).not.toBeInTheDocument()
  })

  it("renders table with data", () => {
    const data = DataSet.create()
    data.addAttribute({ name: "a"} )
    data.addAttribute({ name: "b" })
    data.addCases(toCanonical(data, [{ a: 1, b: 2 }, { a: 3, b: 4 }]))
    broker.addDataSet(data)
    render(<CaseTable broker={broker} />)
    expect(screen.getByTestId("case-table")).toBeInTheDocument()
  })
})
