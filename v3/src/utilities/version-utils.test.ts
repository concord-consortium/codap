import { setUrlParams } from "./url-params"
import { displayVersion, isBeta } from "./version-utils"

describe("displayVersion", () => {
  it("strips build numbers (4+ digits) from prerelease tags", () => {
    expect(displayVersion("3.0.0-beta.2664")).toBe("3.0.0-beta")
    expect(displayVersion("3.0.0-pre.12345")).toBe("3.0.0-pre")
  })

  it("preserves short prerelease numbers like rc.1", () => {
    expect(displayVersion("3.0.0-rc.1")).toBe("3.0.0-rc.1")
    expect(displayVersion("3.0.0-alpha.12")).toBe("3.0.0-alpha.12")
    expect(displayVersion("3.0.0-beta.999")).toBe("3.0.0-beta.999")
  })

  it("preserves release versions", () => {
    expect(displayVersion("3.0.0")).toBe("3.0.0")
    expect(displayVersion("3.1.0")).toBe("3.1.0")
  })
})

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
