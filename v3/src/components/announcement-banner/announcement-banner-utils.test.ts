import {
  isBannerDismissed,
  dismissBanner,
  isPositiveNumber,
  isValidButtonUrl,
  isValidCssColor,
  isWithinDateRange,
  isValidBannerConfig,
  validateBannerConfig,
  fetchBannerConfig,
  parseMessageWithLinks
} from "./announcement-banner-utils"

describe("announcement-banner-utils", () => {
  describe("isValidButtonUrl", () => {
    it("returns true for https URLs", () => {
      expect(isValidButtonUrl("https://example.com")).toBe(true)
      expect(isValidButtonUrl("https://example.com/path#hash")).toBe(true)
    })

    it("returns false for non-https URLs", () => {
      expect(isValidButtonUrl("http://example.com")).toBe(false)
      expect(isValidButtonUrl("javascript:alert(1)")).toBe(false)
      expect(isValidButtonUrl("data:text/html,...")).toBe(false)
      expect(isValidButtonUrl(undefined)).toBe(false)
      expect(isValidButtonUrl("")).toBe(false)
    })
  })

  describe("isValidCssColor", () => {
    it("returns true for valid hex colors", () => {
      expect(isValidCssColor("#fff")).toBe(true)
      expect(isValidCssColor("#ffffff")).toBe(true)
      expect(isValidCssColor("#ffffffff")).toBe(true)
      expect(isValidCssColor("#1a73e8")).toBe(true)
    })

    it("returns true for valid rgb/rgba colors", () => {
      expect(isValidCssColor("rgb(255, 255, 255)")).toBe(true)
      expect(isValidCssColor("rgba(255, 255, 255, 0.5)")).toBe(true)
      expect(isValidCssColor("rgb(0,0,0)")).toBe(true)
    })

    it("returns true for named colors", () => {
      expect(isValidCssColor("red")).toBe(true)
      expect(isValidCssColor("blue")).toBe(true)
      expect(isValidCssColor("transparent")).toBe(true)
    })

    it("returns false for invalid values", () => {
      expect(isValidCssColor(undefined)).toBe(false)
      expect(isValidCssColor("")).toBe(false)
      expect(isValidCssColor("url(evil)")).toBe(false)
      expect(isValidCssColor("#gg0000")).toBe(false)
    })
  })

  describe("parseMessageWithLinks", () => {
    it("returns single text segment for plain text", () => {
      expect(parseMessageWithLinks("Hello world")).toEqual([
        { text: "Hello world" }
      ])
    })

    it("returns single text segment for empty string", () => {
      expect(parseMessageWithLinks("")).toEqual([
        { text: "" }
      ])
    })

    it("parses a single link", () => {
      expect(parseMessageWithLinks("[Click here](https://example.com)")).toEqual([
        { text: "Click here", url: "https://example.com" }
      ])
    })

    it("parses text before and after a link", () => {
      expect(parseMessageWithLinks("Visit [our site](https://example.com) for more.")).toEqual([
        { text: "Visit " },
        { text: "our site", url: "https://example.com" },
        { text: " for more." }
      ])
    })

    it("parses multiple links", () => {
      expect(parseMessageWithLinks("[One](https://one.com) and [Two](https://two.com)")).toEqual([
        { text: "One", url: "https://one.com" },
        { text: " and " },
        { text: "Two", url: "https://two.com" }
      ])
    })

    it("renders non-https URLs as plain text", () => {
      expect(parseMessageWithLinks("[bad](http://evil.com)")).toEqual([
        { text: "[bad](http://evil.com)" }
      ])
    })

    it("renders javascript: URLs as plain text", () => {
      expect(parseMessageWithLinks("[xss](javascript:alert(1))")).toEqual([
        { text: "[xss](javascript:alert(1))" }
      ])
    })

    it("handles URLs with paths, query params, and fragments", () => {
      expect(parseMessageWithLinks("[link](https://example.com/path?q=1#hash)")).toEqual([
        { text: "link", url: "https://example.com/path?q=1#hash" }
      ])
    })

    it("handles unmatched brackets as plain text", () => {
      expect(parseMessageWithLinks("Use [brackets] for grouping")).toEqual([
        { text: "Use [brackets] for grouping" }
      ])
    })

    it("handles empty link text", () => {
      expect(parseMessageWithLinks("[](https://example.com)")).toEqual([
        { text: "[](https://example.com)" }
      ])
    })
  })

  describe("isPositiveNumber", () => {
    it("returns true for zero and positive numbers", () => {
      expect(isPositiveNumber(0)).toBe(true)
      expect(isPositiveNumber(10)).toBe(true)
      expect(isPositiveNumber(3.14)).toBe(true)
    })

    it("returns false for negative numbers", () => {
      expect(isPositiveNumber(-1)).toBe(false)
      expect(isPositiveNumber(-0.5)).toBe(false)
    })

    it("returns false for non-finite numbers", () => {
      expect(isPositiveNumber(Infinity)).toBe(false)
      expect(isPositiveNumber(NaN)).toBe(false)
    })

    it("returns false for non-numbers", () => {
      expect(isPositiveNumber("10")).toBe(false)
      expect(isPositiveNumber(undefined)).toBe(false)
      expect(isPositiveNumber(null)).toBe(false)
    })
  })

  describe("isWithinDateRange", () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date("2024-06-15T12:00:00Z"))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it("returns true when no dates specified", () => {
      expect(isWithinDateRange({ message: "test", id: "1" })).toBe(true)
    })

    it("returns true when within range", () => {
      const config = {
        message: "test",
        id: "1",
        startDate: new Date("2024-01-01").getTime(),
        endDate: new Date("2024-12-31").getTime()
      }
      expect(isWithinDateRange(config)).toBe(true)
    })

    it("returns false when before startDate", () => {
      const config = {
        message: "test",
        id: "1",
        startDate: new Date("2024-07-01").getTime()
      }
      expect(isWithinDateRange(config)).toBe(false)
    })

    it("returns false when after endDate", () => {
      const config = {
        message: "test",
        id: "1",
        endDate: new Date("2024-01-01").getTime()
      }
      expect(isWithinDateRange(config)).toBe(false)
    })

    it("returns false when startDate > endDate (invalid range)", () => {
      const config = {
        message: "test",
        id: "1",
        startDate: new Date("2024-12-31").getTime(),
        endDate: new Date("2024-01-01").getTime()
      }
      expect(isWithinDateRange(config)).toBe(false)
    })
  })

  describe("isValidBannerConfig", () => {
    it("returns true for valid config", () => {
      expect(isValidBannerConfig({ message: "Hello", id: "test-1" })).toBe(true)
    })

    it("returns true for valid config with optional fields", () => {
      expect(isValidBannerConfig({
        message: "Hello",
        id: "test-1",
        buttonText: "Click me",
        buttonUrl: "https://example.com",
        enabled: true
      })).toBe(true)
    })

    it("returns false for missing message", () => {
      expect(isValidBannerConfig({ id: "test-1" })).toBe(false)
    })

    it("returns false for missing id", () => {
      expect(isValidBannerConfig({ message: "Hello" })).toBe(false)
    })

    it("returns false for empty strings", () => {
      expect(isValidBannerConfig({ message: "", id: "test" })).toBe(false)
      expect(isValidBannerConfig({ message: "Hello", id: "" })).toBe(false)
    })

    it("returns false for non-objects", () => {
      expect(isValidBannerConfig(null)).toBe(false)
      expect(isValidBannerConfig("string")).toBe(false)
      expect(isValidBannerConfig(123)).toBe(false)
      expect(isValidBannerConfig(undefined)).toBe(false)
    })
  })

  describe("localStorage functions", () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it("dismissBanner stores dismissal", () => {
      dismissBanner("test-id")
      expect(localStorage.getItem("announcement-banner-dismissed-test-id")).toBe("true")
    })

    it("isBannerDismissed returns true after dismissal", () => {
      expect(isBannerDismissed("test-id")).toBe(false)
      dismissBanner("test-id")
      expect(isBannerDismissed("test-id")).toBe(true)
    })

    it("different ids are tracked separately", () => {
      dismissBanner("banner-1")
      expect(isBannerDismissed("banner-1")).toBe(true)
      expect(isBannerDismissed("banner-2")).toBe(false)
    })
  })

  describe("validateBannerConfig", () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date("2024-06-15T12:00:00Z"))
      localStorage.clear()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it("returns config for a valid, active config", () => {
      const config = { message: "Hello", id: "test-1" }
      expect(validateBannerConfig(config)).toEqual(config)
    })

    it("returns config when enabled is true", () => {
      const config = { message: "Hello", id: "test-1", enabled: true }
      expect(validateBannerConfig(config)).toEqual(config)
    })

    it("returns null for invalid schema", () => {
      expect(validateBannerConfig({ id: "test-1" })).toBeNull()
      expect(validateBannerConfig({ message: "Hello" })).toBeNull()
      expect(validateBannerConfig(null)).toBeNull()
      expect(validateBannerConfig("string")).toBeNull()
    })

    it("returns null when enabled is false", () => {
      expect(validateBannerConfig({ message: "Hello", id: "test-1", enabled: false })).toBeNull()
    })

    it("returns null when outside date range", () => {
      const config = {
        message: "Hello",
        id: "test-1",
        startDate: new Date("2024-07-01").getTime()
      }
      expect(validateBannerConfig(config)).toBeNull()
    })

    it("returns null when banner was dismissed", () => {
      dismissBanner("test-1")
      expect(validateBannerConfig({ message: "Hello", id: "test-1" })).toBeNull()
    })

    it("returns config when within date range", () => {
      const config = {
        message: "Hello",
        id: "test-1",
        startDate: new Date("2024-01-01").getTime(),
        endDate: new Date("2024-12-31").getTime()
      }
      expect(validateBannerConfig(config)).toEqual(config)
    })
  })

  describe("fetchBannerConfig", () => {
    const validConfig = {
      message: "Test message",
      id: "test-1",
      buttonUrl: "https://example.com"
    }

    beforeEach(() => {
      localStorage.clear()
      global.fetch = jest.fn()
    })

    afterEach(() => {
      jest.resetAllMocks()
    })

    it("returns config when fetch succeeds and config is valid", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(validConfig)
      })

      const result = await fetchBannerConfig("https://example.com/banner.json")
      expect(result).toEqual(validConfig)
    })

    it("returns null when fetch fails", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"))

      const result = await fetchBannerConfig("https://example.com/banner.json")
      expect(result).toBeNull()
    })

    it("returns null when response is not ok", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false
      })

      const result = await fetchBannerConfig("https://example.com/banner.json")
      expect(result).toBeNull()
    })

    it("returns null when config is invalid", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ invalid: "config" })
      })

      const result = await fetchBannerConfig("https://example.com/banner.json")
      expect(result).toBeNull()
    })

    it("returns null when enabled is false", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ...validConfig, enabled: false })
      })

      const result = await fetchBannerConfig("https://example.com/banner.json")
      expect(result).toBeNull()
    })

    it("returns null when banner was dismissed", async () => {
      dismissBanner("test-1")
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(validConfig)
      })

      const result = await fetchBannerConfig("https://example.com/banner.json")
      expect(result).toBeNull()
    })
  })
})
