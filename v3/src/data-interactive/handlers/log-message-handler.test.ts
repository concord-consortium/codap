import { kWebViewTileType } from "../../components/web-view/web-view-defs"
import { DIResources, DIValues } from "../data-interactive-types"
import { diLogMessageHandler } from "./log-message-handler"
import { appState } from "../../models/app-state"

describe("DataInteractive LogMessageHandler", () => {
  const handler = diLogMessageHandler

  it("notify works", () => {
    const interactiveFrame = appState.document.content!.createOrShowTile(kWebViewTileType)!;
    const resources: DIResources = { interactiveFrame }
    const values: DIValues = { formatStr: "Hello, World!" }
    const notify = handler.notify!
    expect(notify(resources, values).success).toBe(true)
  })
})
