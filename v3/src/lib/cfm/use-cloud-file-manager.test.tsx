import { act, render, renderHook, screen, waitFor } from "@testing-library/react"
import { CloudFileManager, CloudFileManagerClientEvent } from "@concord-consortium/cloud-file-manager"
import { ReactNode } from "react"
import { Root } from "react-dom/client"
import { uiState } from "../../models/ui-state"
import { LogMessage, Logger } from "../logger"
import { getMenuBar, useCloudFileManager } from "./use-cloud-file-manager"

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

  it("forwards Logger events to cfm.client.log with parameters only", async () => {
    render(<div id="container-div" data-testid="container-div"/>)

    let registeredListener: ((msg: LogMessage) => void) | undefined
    const spyRegister = jest.spyOn(Logger, "registerLogListener")
      .mockImplementation((listener) => {
        registeredListener = listener
      })

    let cfm: CloudFileManager | undefined
    renderHook(() => {
      const { cfm: _cfm } = useCloudFileManager({ appOrMenuElemId: "container-div" })
      cfm = _cfm
    })

    await waitFor(() => expect(registeredListener).toBeDefined())

    const spyClientLog = jest.spyOn(cfm!.client, "log").mockImplementation(() => undefined)

    const baseMessage: LogMessage = {
      application: "CODAPV3",
      activity: "doc-title",
      session: "test-session",
      time: 1234567890,
      event: "testEvent",
      event_value: "some-event-value",
      run_remote_endpoint: "https://example.com/run",
      parameters: { foo: "bar" }
    }

    // only parameters are forwarded; top-level fields (application, session, time,
    // run_remote_endpoint, activity, event_value) are not forwarded
    registeredListener!(baseMessage)
    expect(spyClientLog).toHaveBeenCalledTimes(1)
    expect(spyClientLog).toHaveBeenCalledWith("testEvent", { foo: "bar" })

    // parameters undefined → empty object
    spyClientLog.mockClear()
    registeredListener!({ ...baseMessage, parameters: undefined })
    expect(spyClientLog).toHaveBeenCalledWith("testEvent", {})

    spyClientLog.mockRestore()
    spyRegister.mockRestore()
  })

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

describe("getMenuBar", () => {
  afterEach(() => {
    uiState.closeAboutDialog()
  })

  it("ends the Help menu with a separator and an About CODAP item that opens the About dialog", () => {
    // the Help menu button that focus should return to when the dialog closes
    render(<div className="help-menu"><button className="menu-anchor">Help</button></div>)
    const menuBar = getMenuBar({} as CloudFileManager)
    const helpMenu = menuBar.otherMenus.find(menu => menu.className === "help-menu")!
    const separator = helpMenu.menu.at(-2)
    const aboutItem = helpMenu.menu.at(-1) as { name: string, action: () => void }
    expect(separator).toEqual({ separator: true })
    expect(aboutItem.name).toBe("About CODAP...")
    aboutItem.action()
    expect(uiState.initialAboutDialogView).toBe("about")
    expect(uiState.aboutDialogReturnFocusRef?.current).toBe(screen.getByRole("button", { name: "Help" }))
  })
})
