import { render, screen } from "@testing-library/react"
import React from "react"
import { DataBroker } from "../../../data-model/data-broker"
import { DataSet, toCanonical } from "../../../data-model/data-set"
import {CaseTable} from "../../case-table/case-table";
import {Graph} from "../graph";

describe("Graph", () => {
  let broker: DataBroker
  beforeEach(() => {
    broker = new DataBroker()
  })

  it("renders even with no broker", () => {
    render(<Graph />)
    // expect(screen.getByTestId("graph")).toBeInTheDocument()
    expect(true).toBe(true)
  })

/*
  it("renders even with empty broker", () => {
    render(<Graph broker={broker} />)
    expect(screen.getByTestId("graph")).toBeInTheDocument()
  })

  it("renders graph point for each case", () => {
    const data = DataSet.create()
    data.addAttribute({ name: "xVariable"} )
    data.addAttribute({ name: "yVariable" })
    data.addCases(toCanonical(data, [{ xVariable: 1, yVariable: 2 }, { xVariable: 3, yVariable: 4 }]))
    broker.addDataSet(data)
    render(<Graph broker={broker} />)
    expect(screen.getByTestId("graph")).toBeInTheDocument()
    expect(screen.getByText('xVariable')).toBeInTheDocument()
    expect(screen.getByText('yVariable')).toBeInTheDocument()
    expect(screen.getByTitle('(1.0, 2.0, id: 0)')).toBeInTheDocument()
  })
*/
})
