import { render, screen } from "@testing-library/react"
import React from "react"
import { gDataBroker } from "../data-model/data-broker"
import { App, handleImportData } from "./app"

// used by case table
jest.mock("../hooks/use-measure-text", () => ({
  measureText: (text: string) => text.length * 6
}))

describe("App component", () => {
  const originalLocation = window.location

  const mockWindowLocation = (newLocation: Location | URL) => {
    delete (window as any).location
    window.location = newLocation as Location
  }

  const setLocation = (url: string) => {
    mockWindowLocation(new URL(url))
  }

  const setQueryParams = (params?: string) => {
    setLocation(`https://concord.org${params ? `?${params}` : ""}`)
  }

  afterEach(() => {
    gDataBroker.clear()
    mockWindowLocation(originalLocation)
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
    setQueryParams("mammals")
    render(<App/>)
    expect(screen.getByTestId("app")).toBeInTheDocument()
  })
})
