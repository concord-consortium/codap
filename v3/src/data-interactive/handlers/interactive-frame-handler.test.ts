
import { kWebViewTileType } from "../../components/web-view/web-view-defs"
import { createDefaultTileOfType } from "../../models/codap/add-default-content"
import { diInteractiveFrameHandler } from "./interactive-frame-handler"
import "../../components/web-view/web-view-registration"
import { IWebViewModel } from "../../components/web-view/web-view-model"

describe("DataInteractive InteractiveFrameHandler", () => {
  const handler = diInteractiveFrameHandler
  it("update works as expected", () => {
    const tile = createDefaultTileOfType(kWebViewTileType)!
    const webViewContent = tile.content as IWebViewModel

    const preventAttributeDeletion = true
    const respectEditableItemAttribute = true
    const values = { preventAttributeDeletion, respectEditableItemAttribute }

    expect(handler.update?.({}, values).success).toBe(false)

    expect(webViewContent.preventAttributeDeletion).toBe(false)
    expect(webViewContent.respectEditableItemAttribute).toBe(false)
    expect(handler.update?.({ interactiveFrame: tile }, values).success).toBe(true)
    expect(webViewContent.preventAttributeDeletion).toBe(true)
    expect(webViewContent.respectEditableItemAttribute).toBe(true)
  })
})
