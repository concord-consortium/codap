import { kCodap3RootPluginsUrl, kRootDataGamesPluginUrl, kRootGuideUrl, kRootPluginsUrl } from "../../constants"
import {
  appendLangParam, getNameFromURL, kRelativeGuideRoot, kRelativePluginRoot, kRelativeURLRoot,
  normalizeUrlScheme, processWebViewUrl
} from "./web-view-utils"

const kTestUrls: Array<{ original: string, processed: string }> = [
  {
    original: "https://concord-consortium.github.io/codap-data-interactives/Markov/",
    processed: `${kRootDataGamesPluginUrl}/Markov/index.html`
  },
  {
    original: "../../../../extn/plugins/onboarding/",
    processed: `${kCodap3RootPluginsUrl}/onboarding/index.html`
  },
  {
    original: "../../../../extn/plugins/onboarding/onboarding_2.html",
    processed: `${kCodap3RootPluginsUrl}/onboarding/onboarding_2.html`
  },
  {
    original: "https://test/",
    processed: "https://test/index.html"
  },
  {
    original: `${kRelativePluginRoot}/index.html`,
    processed: `${kRootPluginsUrl}/index.html`
  },
  {
    original: `${kRelativePluginRoot}/subdir/`,
    processed: `${kRootPluginsUrl}/subdir/index.html`
  },
  {
    original: `${kRelativeGuideRoot}/Markov/markov_getstarted.html`,
    processed: `${kRootGuideUrl}/Markov/markov_getstarted.html`
  },
  {
    original: `${kRelativeURLRoot}/Markov/markov_getstarted.html`,
    processed: `${kRootGuideUrl}/Markov/markov_getstarted.html`
  },
  {
    original: "http://index.html",
    processed: "https://index.html"
  }
]

describe('WebView Utilities', () => {
  it('processPluginUrl works', () => {
    kTestUrls.forEach(({ original, processed }) => {
      expect(processWebViewUrl(original)).toEqual(processed)
    })
  })
})

describe("normalizeUrlScheme", () => {
  it("prepends https:// to bare hostnames", () => {
    expect(normalizeUrlScheme("example.com")).toBe("https://example.com")
  })
  it("preserves existing http:// scheme", () => {
    expect(normalizeUrlScheme("http://example.com")).toBe("http://example.com")
  })
  it("preserves existing https:// scheme", () => {
    expect(normalizeUrlScheme("https://example.com/path")).toBe("https://example.com/path")
  })
  it("preserves data: URLs", () => {
    expect(normalizeUrlScheme("data:image/png;base64,abc")).toBe("data:image/png;base64,abc")
  })
  it("preserves blob: URLs", () => {
    expect(normalizeUrlScheme("blob:http://example.com/uuid")).toBe("blob:http://example.com/uuid")
  })
  it("handles scheme-relative URLs (//example.com)", () => {
    expect(normalizeUrlScheme("//example.com/path")).toBe("https://example.com/path")
  })
  it("trims whitespace before processing", () => {
    expect(normalizeUrlScheme("  example.com  ")).toBe("https://example.com")
    expect(normalizeUrlScheme("  //example.com/path  ")).toBe("https://example.com/path")
    expect(normalizeUrlScheme("  https://example.com  ")).toBe("https://example.com")
  })
})

describe("getNameFromURL", () => {
  it("returns empty string for null, undefined, or empty string", () => {
    expect(getNameFromURL(null)).toBe("")
    expect(getNameFromURL(undefined)).toBe("")
    expect(getNameFromURL("")).toBe("")
  })
  it("extracts name from simple paths without query params", () => {
    expect(getNameFromURL("/datagame/game.html")).toBe("game")
    expect(getNameFromURL("/datagame/game")).toBe("game")
  })
  it("ignores query params when extracting the name", () => {
    expect(getNameFromURL("/datagame/game.html?param=abc.123")).toBe("game")
    expect(getNameFromURL("/datagame/game?param=abc.123")).toBe("game")
  })
  it("ignores hash fragments when extracting the name", () => {
    expect(getNameFromURL("/datagame/game.html#section1")).toBe("game")
    expect(getNameFromURL("/datagame/game#section1")).toBe("game")
  })
  it("handles trailing slashes by returning the last folder name", () => {
    expect(getNameFromURL("/datagame/game/")).toBe("game")
    expect(getNameFromURL("/datagame/simulations/motion/")).toBe("motion")
  })
  it("handles multiple trailing slashes by returning the last non-empty segment", () => {
    expect(getNameFromURL("/datagame///")).toBe("datagame")
  })
  it("strips extensions even when there are multiple dots", () => {
    expect(getNameFromURL("/datagame/game.min.html")).toBe("game")
    expect(getNameFromURL("/datagame/my.game.level.html")).toBe("my")
  })
  it("returns first part of domain when there is no pathname in an absolute URL", () => {
    expect(getNameFromURL("https://sampler.concord.org/")).toBe("sampler")
    expect(getNameFromURL("https://example.com/")).toBe("example")
    expect(getNameFromURL("https://foo.bar.baz.org/")).toBe("foo")
  })
  it("returns first part of domain when there is no pathname and input is a URL instance", () => {
    const url1 = new URL("https://sampler.concord.org/")
    const url2 = new URL("https://example.com/")
    expect(getNameFromURL(url1)).toBe("sampler")
    expect(getNameFromURL(url2)).toBe("example")
  })
  it("falls back to current origin's hostname when given root path '/'", () => {
    // In Jest + jsdom, window.location.origin is usually "http://localhost"
    // so hostname is "localhost" → first part is "localhost".
    expect(getNameFromURL("/")).toBe(window.location.hostname.split(".")[0])
  })
  it("accepts a URL instance", () => {
    const url = new URL("https://example.com/datagame/game.html?param=abc.123")
    expect(getNameFromURL(url)).toBe("game")
  })
  it("works with absolute URLs as strings", () => {
    expect(getNameFromURL("https://example.com/datagame/game.html?param=abc.123")).toBe("game")
  })
  it("returns empty string for data URLs", () => {
    expect(getNameFromURL("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ")).toBe("")
    expect(getNameFromURL("data:text/plain;charset=utf-8,Hello%20World")).toBe("")
  })
})

describe("appendLangParam", () => {
  it("appends ?lang= to URLs with no query params", () => {
    expect(appendLangParam("https://example.com/plugin/index.html", "es"))
      .toBe("https://example.com/plugin/index.html?lang=es")
  })
  it("appends &lang= to URLs with existing query params", () => {
    expect(appendLangParam("https://example.com/plugin/index.html?foo=bar", "ja"))
      .toBe("https://example.com/plugin/index.html?foo=bar&lang=ja")
  })
  it("replaces existing lang param", () => {
    expect(appendLangParam("https://example.com/plugin/index.html?lang=en-US", "es"))
      .toBe("https://example.com/plugin/index.html?lang=es")
  })
  it("replaces existing lang param among other params", () => {
    expect(appendLangParam("https://example.com/plugin/index.html?foo=bar&lang=en-US&baz=qux", "ja"))
      .toBe("https://example.com/plugin/index.html?foo=bar&lang=ja&baz=qux")
  })
  it("returns the URL unchanged for data: URLs", () => {
    expect(appendLangParam("data:image/png;base64,abc", "es"))
      .toBe("data:image/png;base64,abc")
  })
  it("returns empty string unchanged", () => {
    expect(appendLangParam("", "es")).toBe("")
  })
  it("appends lang param to relative URLs", () => {
    expect(appendLangParam("../../../../extn/plugins/onboarding/index.html", "de"))
      .toBe("../../../../extn/plugins/onboarding/index.html?lang=de")
  })
  it("replaces lang param in relative URLs", () => {
    expect(appendLangParam("../plugin/index.html?lang=en&foo=bar", "fr"))
      .toBe("../plugin/index.html?lang=fr&foo=bar")
  })
  it("appends lang param before hash fragment in relative URLs", () => {
    expect(appendLangParam("../plugin/index.html#section", "es"))
      .toBe("../plugin/index.html?lang=es#section")
  })
  it("handles existing query params and hash fragment in relative URLs", () => {
    expect(appendLangParam("../plugin/index.html?foo=bar#section", "es"))
      .toBe("../plugin/index.html?foo=bar&lang=es#section")
  })
  it("replaces lang param without dropping hash fragment in relative URLs", () => {
    expect(appendLangParam("../plugin/index.html?lang=en#section", "es"))
      .toBe("../plugin/index.html?lang=es#section")
  })
})
