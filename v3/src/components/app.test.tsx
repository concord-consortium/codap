import { CloudFileManager, CloudFileManagerClientEvent } from "@concord-consortium/cloud-file-manager"
import { act, render, screen } from "@testing-library/react"
import React, { ReactNode } from "react"
import { Root } from "react-dom/client"
import { prf } from "../utilities/profiler"
import { setUrlParams } from "../utilities/url-params"
import { App } from "./app"

let cfm: CloudFileManager | undefined
let spySetMenuBarInfo: jest.SpyInstance | undefined

jest.mock("../lib/cfm/cfm-utils", () => {
  const cfmUtils = jest.requireActual("../lib/cfm/cfm-utils")

  return {
    createCloudFileManager() {
      // suppress warning about not being instantiated in an iframe
      jestSpyConsole("warn", () => {
        cfm = cfmUtils.createCloudFileManager()
      })
      // suppress warnings about setting state outside of act()
      spySetMenuBarInfo = jest.spyOn(cfm!.client._ui, "setMenuBarInfo")
      spySetMenuBarInfo.mockImplementation(() => null)
      return cfm!
    },
    renderRoot(root: Root | undefined, content: ReactNode) {
      // eslint-disable-next-line testing-library/no-unnecessary-act
      act(() => {
        cfmUtils.renderRoot(root, content)
      })
    },
    clientConnect(_cfm: CloudFileManager, handler: (event: CloudFileManagerClientEvent) => void) {
      act(() => {
        cfmUtils.clientConnect(_cfm, handler)
      })
    },
    wrapCfmCallback(callbackFn: () => void) {
      act(() => {
        cfmUtils.wrapCfmCallback(callbackFn)
      })
    }
  }
})

// mock the `ToolShelf` component because it generates warnings:
//  Warning: An update to ToolShelf inside a test was not wrapped in act(...).
// This shouldn't affect coverage because `ToolShelf` has its own jest test
// and it's also tested by the cypress tests.
jest.mock("./tool-shelf/tool-shelf", () => ({
  ToolShelf: () => null
}))

describe.skip("App component", () => {

  afterEach(() => {
    spySetMenuBarInfo?.mockRestore()
    spySetMenuBarInfo = undefined
    cfm = undefined
  })

  it("should render the App component with no data", () => {
    render(<App/>)
    expect(screen.getByTestId("codap-app")).toBeInTheDocument()
  })

  it("should render the App component with no data and dashboard", () => {
    setUrlParams("?dashboard&noDataTips")
    render(<App/>)
    expect(screen.getByTestId("codap-app")).toBeInTheDocument()
  })

  it("should render the App component with mammals data", () => {
    setUrlParams("?sample=mammals&noDataTips")
    render(<App/>)
    expect(screen.getByTestId("codap-app")).toBeInTheDocument()
  })

  it("should render the App component with mammals data and dashboard", () => {
    setUrlParams("?sample=mammals&dashboard&noDataTips")
    render(<App/>)
    expect(screen.getByTestId("codap-app")).toBeInTheDocument()
  })

  it("should render the App component with mammals data and profiling", () => {
    setUrlParams("?sample=mammals&noDataTips")
    prf.beginProfiling()
    render(<App/>)
    prf.endProfiling()
    const mockConsole = jest.spyOn(console, "log").mockImplementation(() => null)
    prf.report()
    mockConsole.mockRestore()
    expect(screen.getByTestId("codap-app")).toBeInTheDocument()
  })

})
