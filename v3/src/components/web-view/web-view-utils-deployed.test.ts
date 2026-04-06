/**
 * Tests for processWebViewUrl() in the deployed environment where kCodapResourcesUrl
 * is a relative path ("/codap-resources") rather than the localhost absolute URL.
 * This simulates the behavior on codap3.concord.org / codap.concord.org.
 */

// Mock constants to simulate deployed environment (not localhost)
jest.mock("../../constants", () => {
  const kCodapResourcesUrl = "/codap-resources"
  const codapResourcesUrl = (relUrl: string) => `${kCodapResourcesUrl}/${relUrl}`
  return {
    ...jest.requireActual("../../constants"),
    getCodapResourcesUrl: () => kCodapResourcesUrl,
    kCodapResourcesUrl,
    codapResourcesUrl,
    kRootPluginsUrl: codapResourcesUrl("plugins"),
    kRootDataGamesPluginUrl: codapResourcesUrl("plugins/data-games"),
    kRootGuideUrl: codapResourcesUrl("example-documents/guides"),
  }
})

import { processWebViewUrl } from "./web-view-utils"

describe("processWebViewUrl with deployed (relative) URLs", () => {

  it("rewrites codap-resources.concord.org URLs to relative /codap-resources/ paths", () => {
    expect(processWebViewUrl("https://codap-resources.concord.org/plugins/Foo/index.html"))
      .toBe("/codap-resources/plugins/Foo/index.html")
  })

  it("rewrites codap3.concord.org/plugins/ URLs to relative /codap-resources/plugins/ paths", () => {
    expect(processWebViewUrl("https://codap3.concord.org/plugins/onboarding/index.html"))
      .toBe("/codap-resources/plugins/onboarding/index.html")
  })

  it("does not double-rewrite URLs already using /codap-resources/", () => {
    expect(processWebViewUrl("/codap-resources/plugins/Foo/index.html"))
      .toBe("/codap-resources/plugins/Foo/index.html")
  })

  it("rewrites relative v2 plugin paths to relative /codap-resources/ paths", () => {
    expect(processWebViewUrl("../../../../extn/plugins/onboarding/index.html"))
      .toBe("/codap-resources/plugins/onboarding/index.html")
  })

  it("rewrites relative v2 guide paths to relative /codap-resources/ paths", () => {
    expect(processWebViewUrl("../../../../extn/example-documents/guides/Mammals/mammals_getstarted.html"))
      .toBe("/codap-resources/example-documents/guides/Mammals/mammals_getstarted.html")
  })

  it("rewrites Markov GitHub Pages URL to relative /codap-resources/ path", () => {
    expect(processWebViewUrl("https://concord-consortium.github.io/codap-data-interactives/Markov/"))
      .toBe("/codap-resources/plugins/data-games/Markov/index.html")
  })

  it("rewrites NOAA weather plugin to relative /codap-resources/ path", () => {
    expect(processWebViewUrl("/plugins/NOAA-weather/index.html"))
      .toBe("/codap-resources/plugins/noaa-codap-plugin/index.html")
  })

  it("does not rewrite external URLs", () => {
    expect(processWebViewUrl("https://example.com/my-page.html"))
      .toBe("https://example.com/my-page.html")
  })

  it("does not rewrite data: URLs", () => {
    expect(processWebViewUrl("data:image/png;base64,abc123"))
      .toBe("data:image/png;base64,abc123")
  })

  it("appends index.html for directory URLs", () => {
    expect(processWebViewUrl("https://codap-resources.concord.org/plugins/Foo/"))
      .toBe("/codap-resources/plugins/Foo/index.html")
  })
})
