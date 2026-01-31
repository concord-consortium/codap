import { act, render, renderHook, screen, waitFor } from "@testing-library/react"
import { CloudFileManager, CloudFileManagerClientEvent } from "@concord-consortium/cloud-file-manager"
import { ReactNode } from "react"
import { Root } from "react-dom/client"
import { useCloudFileManager } from "./use-cloud-file-manager"

let spySetMenuBarInfo: jest.SpyInstance | undefined

jest.mock("./cfm-utils", () => {
  const cfmUtils = jest.requireActual("./cfm-utils")

  return {
    createCloudFileManager() {
      let cfm: CloudFileManager | undefined
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

describe("useCloudFileManager", () => {

  it("instantiates the CFM and renders the menu bar under the specified parent", async () => {
    render(<div id="container-div" data-testid="container-div"/>)
    const containerDiv = screen.getByTestId("container-div")
    expect(containerDiv).toBeInTheDocument()

    let cfm: CloudFileManager | undefined
    renderHook(() => {
      const { cfm: _cfm } = useCloudFileManager({ appOrMenuElemId: "container-div" })
      cfm = _cfm
    })
    expect(cfm).toBeDefined()
    await waitFor(() => {
      // eslint-disable-next-line testing-library/no-node-access
      expect(containerDiv.getElementsByClassName("view")[0]).toBeInTheDocument()
    })
    await waitFor(() => {
      // eslint-disable-next-line testing-library/no-node-access
      expect(containerDiv.getElementsByClassName("menu-bar")[0]).toBeInTheDocument()
    })
  })
})
