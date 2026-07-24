import { act, renderHook } from "@testing-library/react"
import iframePhone from "iframe-phone"
import { DIComponentInfo } from "../../data-interactive/data-interactive-types"
import { diComponentHandler } from "../../data-interactive/handlers/component-handler"
import { appState } from "../../models/app-state"
import { toV3Id } from "../../utilities/codap-utils"
import { extractOrigin, useDataInteractiveController } from "./use-data-interactive-controller"
import { IWebViewModel } from "./web-view-model"
import { kWebViewIdPrefix } from "./web-view-registration"

// Replace iframe-phone with lightweight mocks so the hook doesn't attempt real postMessage
// handshakes; we only care about how many times a connection (ParentEndpoint) is established.
jest.mock("iframe-phone", () => ({
  __esModule: true,
  default: {
    ParentEndpoint: jest.fn(() => ({ disconnect: jest.fn() })),
    IframePhoneRpcEndpoint: jest.fn(() => ({ call: jest.fn(), disconnect: jest.fn() }))
  }
}))

jest.mock("../../hooks/use-cfm-context", () => ({ useCfmContext: () => undefined }))

jest.mock("../../data-interactive/data-interactive-request-processor", () => ({
  setupRequestQueueProcessor: jest.fn(() => jest.fn())
}))

describe("extractOrigin", () => {
  it("extracts origin from absolute https URLs", () => {
    expect(extractOrigin("https://codap-resources.concord.org/plugins/Foo/index.html"))
      .toBe("https://codap-resources.concord.org")
  })

  it("extracts origin from absolute http URLs", () => {
    expect(extractOrigin("http://example.com/page.html"))
      .toBe("http://example.com")
  })

  it("resolves relative URLs against window.location.origin", () => {
    // In Jest/jsdom, window.location.origin is "http://localhost"
    expect(extractOrigin("/codap-resources/plugins/Foo/index.html"))
      .toBe("http://localhost")
  })

  it("resolves relative paths without leading slash", () => {
    expect(extractOrigin("codap-resources/plugins/Foo/index.html"))
      .toBe("http://localhost")
  })

  it("returns undefined for undefined input", () => {
    expect(extractOrigin(undefined)).toBeUndefined()
  })

  it("returns undefined for empty string", () => {
    expect(extractOrigin("")).toBeUndefined()
  })

  it("handles data: URLs", () => {
    expect(extractOrigin("data:image/png;base64,abc123"))
      .toBe("null")
  })
})

describe("useDataInteractiveController", () => {
  // CODAP-1424: An interactive added by drag/drop or URL import starts as a generic web view.
  // When its plugin handshake succeeds, CODAP promotes it to a plugin (setSubType("plugin")),
  // which flips `needsLocaleReload` to true and forces the iframe to reload with locale params
  // WITHOUT changing the model url. The connection effect must re-run on that flip so that the
  // reloaded iframe is re-sent `codap-present`; otherwise the surviving load never learns it is
  // embedded in CODAP and the plugin's "send data to CODAP" UI stays hidden.
  it("re-establishes the connection when a generic web view is promoted to a plugin", () => {
    const documentContent = appState.document.content!
    const result = diComponentHandler.create!(
      {}, { type: "webView", URL: "https://lab.concord.org/embeddable.html#interactives/sample.json" })
    const id = (result.values as DIComponentInfo).id!
    const tile = documentContent.tileMap.get(toV3Id(kWebViewIdPrefix, id))!
    const webViewModel = tile.content as IWebViewModel
    const ParentEndpoint = iframePhone.ParentEndpoint as unknown as jest.Mock

    // Precondition: a dropped/imported URL is a generic web view that does not reload for locale.
    expect(webViewModel.needsLocaleReload).toBe(false)

    const iframeRef = { current: document.createElement("iframe") }
    const { rerender } = renderHook(() => useDataInteractiveController(iframeRef, tile))
    const connectionsAfterMount = ParentEndpoint.mock.calls.length
    expect(connectionsAfterMount).toBeGreaterThanOrEqual(1)

    // Simulate the plugin handshake promoting the generic web view to a plugin.
    act(() => { webViewModel.setPluginIsCommunicating() })
    expect(webViewModel.needsLocaleReload).toBe(true)
    // The model url is unchanged — only the computed iframe src (with locale params) changes,
    // so without `needsLocaleReload` in the effect deps the connection would NOT re-establish.
    expect(webViewModel.url).toBe("https://lab.concord.org/embeddable.html#interactives/sample.json")

    rerender()
    expect(ParentEndpoint.mock.calls.length).toBeGreaterThan(connectionsAfterMount)
  })
})
