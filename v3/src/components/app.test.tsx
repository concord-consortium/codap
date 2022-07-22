import { render, screen } from "@testing-library/react"
import React from "react"
import { gDataBroker } from "../data-model/data-broker"
import { App, handleImportData } from "./app"

describe("App component", () => {
  it("should import data into a DataSet and into the DataBroker", () => {
    handleImportData([{ a: "a1", b: "b1" }, { a: "a2", b: "b2" }], "test")
    expect(gDataBroker.length).toBe(1)
    expect(gDataBroker.first?.name).toBe("test")
    const ds = gDataBroker.getDataSetByName("test")
    expect(ds).toBeDefined()
    expect(ds?.attributes.length).toBe(2)
    expect(ds?.cases.length).toBe(2)
  })

  it("should render the App component", () => {
    render(<App/>)
    expect(screen.getByTestId("app")).toBeInTheDocument()
  })
})
