import { render, renderHook, screen } from "@testing-library/react"
import { CloudFileManager } from "@concord-consortium/cloud-file-manager"
import React from "react"
import { useCloudFileManager } from "./use-cloud-file-manager"

let _cfm: CloudFileManager | undefined
let spySetMenuBarInfo: jest.SpyInstance | undefined

jest.mock("../lib/cfm-utils", () => ({
  createCloudFileManager() {
    // suppress warning about not being instantiated in an iframe
    jestSpyConsole("warn", () => {
      _cfm = new CloudFileManager()
    })
    // suppress warnings about setting state outside of act()
    spySetMenuBarInfo = jest.spyOn(_cfm!.client._ui, "setMenuBarInfo")
    spySetMenuBarInfo.mockImplementation(() => null)
    return _cfm!
  },
  wrapCfmCallback(callbackFn: () => void) {
    callbackFn()
  }
}))

describe("useCloudFileManager", () => {
  it("instantiates the CFM and renders the menu bar under the specified parent", () => {
    render(<div id="container-div" data-testid="container-div"/>)
    const containerDiv = screen.getByTestId("container-div")
    expect(containerDiv).toBeInTheDocument()

    let cfm: CloudFileManager | undefined
    renderHook(() => {
      cfm = useCloudFileManager({ appOrMenuElemId: "container-div" })
    })
    expect(cfm).toBeDefined()
    // eslint-disable-next-line testing-library/no-node-access
    expect(containerDiv.getElementsByClassName("view")[0]).toBeInTheDocument()
    // eslint-disable-next-line testing-library/no-node-access
    expect(containerDiv.getElementsByClassName("menu-bar")[0]).toBeInTheDocument()
  })
})
