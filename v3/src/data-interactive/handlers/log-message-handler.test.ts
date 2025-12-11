import "../../components/web-view/web-view-registration"
import { kWebViewTileType } from "../../components/web-view/web-view-defs"
import { DILogMessage, DIResources, DIValues } from "../data-interactive-types"
import { diLogMessageHandler } from "./log-message-handler"
import { appState } from "../../models/app-state"
import { IWebViewModel } from "../../components/web-view/web-view-model"

describe("DataInteractive LogMessageHandler", () => {
  const handler = diLogMessageHandler
  const notify = handler.notify!

  it("notify works", () => {
    const interactiveFrame = appState.document.content!.createOrShowTile(kWebViewTileType)!
    const resources: DIResources = { interactiveFrame }
    const values: DIValues = { formatStr: "Hello, World!" }
    expect(notify(resources, values).success).toBe(true)
  })

  it('should send the log message to the model', () => {
    expect(notify({}).success).toBe(false)
    const interactiveFrame = appState.document.content!.createOrShowTile(kWebViewTileType)!
    const webViewContent = interactiveFrame.content as IWebViewModel
    webViewContent.applyModelChange = jest.fn()
    const resources: DIResources = { interactiveFrame }
    const values: DIValues = {
      formatStr: "This is a log message with %@",
      replaceArgs: ["replacement"]
    } as DILogMessage

    notify(resources, values)
    expect(webViewContent.applyModelChange).toHaveBeenCalled()
    expect(webViewContent.applyModelChange).toHaveBeenCalledWith(expect.any(Function), {
      noDirty: true, log: {message: "This is a log message with replacement", args: {0: "replacement"}}
    })
  })
})
