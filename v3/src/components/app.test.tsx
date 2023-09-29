import { render, screen } from "@testing-library/react"
import React from "react"
import { prf } from "../utilities/profiler"
import { setUrlParams } from "../utilities/url-params"
import { App } from "./app"

// mock the `ToolShelf` component because it generates warnings:
//  Warning: An update to ToolShelf inside a test was not wrapped in act(...).
// This shouldn't affect coverage because `ToolShelf` has its own jest test
// and it's also tested by the cypress tests.
jest.mock("./tool-shelf/tool-shelf", () => ({
  ToolShelf: () => null
}))

describe("App component", () => {

  it("should render the App component with no data", () => {
    render(<App/>)
    expect(screen.getByTestId("app")).toBeInTheDocument()
  })

  it("should render the App component with no data and dashboard", () => {
    setUrlParams("?dashboard&noDataTips")
    render(<App/>)
    expect(screen.getByTestId("app")).toBeInTheDocument()
  })

  it("should render the App component with mammals data", () => {
    setUrlParams("?sample=mammals&noDataTips")
    render(<App/>)
    expect(screen.getByTestId("app")).toBeInTheDocument()
  })

  it("should render the App component with mammals data and dashboard", () => {
    setUrlParams("?sample=mammals&dashboard&noDataTips")
    render(<App/>)
    expect(screen.getByTestId("app")).toBeInTheDocument()
  })

  it("should render the App component with mammals data and profiling", () => {
    setUrlParams("?sample=mammals&noDataTips")
    prf.beginProfiling()
    render(<App/>)
    prf.endProfiling()
    const mockConsole = jest.spyOn(console, "log").mockImplementation(() => null)
    prf.report()
    mockConsole.mockRestore()
    expect(screen.getByTestId("app")).toBeInTheDocument()
  })
})
