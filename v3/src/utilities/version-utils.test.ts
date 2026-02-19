import { setUrlParams } from "./url-params"
import { isBeta } from "./version-utils"

describe("isBeta", () => {
  const originalHref = window.location.href

  const setLocation = (url: string) => {
    const urlObj = new URL(url)
    window.history.replaceState(null, "", urlObj.pathname + urlObj.search + urlObj.hash)
  }

  afterEach(() => {
    // Restore original location and clear url params
    window.history.replaceState(null, "", new URL(originalHref).pathname)
    setUrlParams("")
  })

  it("returns true for release=beta url param", () => {
    setUrlParams("?release=beta")
    expect(isBeta()).toBe(true)
  })

  it("returns true when a path segment is 'beta'", () => {
    const betaUrls = [
      "http://localhost/beta",
      "http://localhost/beta/",
      "http://localhost/branch/beta",
      "http://localhost/branch/beta/",
      "http://localhost/beta/index.html",
    ]
    for (const url of betaUrls) {
      setLocation(url)
      expect(isBeta()).toBe(true)
    }
  })

  it("returns false for non-beta URLs", () => {
    const nonBetaUrls = [
      "http://localhost/",
      "http://localhost/release",
      "http://localhost/branch/main",
      "http://localhost/betamax",
      "http://localhost/my-beta-test",
    ]
    for (const url of nonBetaUrls) {
      setLocation(url)
      expect(isBeta()).toBe(false)
    }
  })
})
