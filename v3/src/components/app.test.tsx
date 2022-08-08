import { render, screen } from "@testing-library/react"
import React from "react"
import { gDataBroker } from "../data-model/data-broker"
import { prf } from "../utilities/profiler"
import { setUrlParams } from "../utilities/url-params"
import { App, handleImportData } from "./app"

// used by case table
jest.mock("../hooks/use-measure-text", () => ({
  measureText: (text: string) => text.length * 6
}))

describe("App component", () => {
  beforeEach(() => {
    gDataBroker.clear()
  })

  it("should import data into a DataSet and into the DataBroker", () => {
    handleImportData([{ a: "a1", b: "b1" }, { a: "a2", b: "b2" }], "test")
    expect(gDataBroker.length).toBe(1)
    expect(gDataBroker.first?.name).toBe("test")
    const ds = gDataBroker.getDataSetByName("test")
    expect(ds).toBeDefined()
    expect(ds?.attributes.length).toBe(2)
    expect(ds?.cases.length).toBe(2)
  })

  it("should render the App component with no data", () => {
    render(<App/>)
    expect(screen.getByTestId("app")).toBeInTheDocument()
  })

  it("should render the App component with mammals data", () => {
    setUrlParams("?sample=mammals")
    render(<App/>)
    expect(screen.getByTestId("app")).toBeInTheDocument()
  })

  it("should render the App component with mammals data and profiling", () => {
    setUrlParams("?sample=mammals")
    prf.beginProfiling()
    render(<App/>)
    prf.endProfiling()
    const mockConsole = jest.spyOn(console, "log").mockImplementation(() => null)
    prf.report()
    mockConsole.mockRestore()
    expect(screen.getByTestId("app")).toBeInTheDocument()
  })
})
