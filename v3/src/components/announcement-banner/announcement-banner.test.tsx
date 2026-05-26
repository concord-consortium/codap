import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { AnnouncementBanner } from "./announcement-banner"
import { dismissBanner } from "./announcement-banner-utils"

function mockFetchResolve(data: unknown) {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data)
  })
}

function mockFetchReject(error: Error) {
  (global.fetch as jest.Mock).mockRejectedValue(error)
}

function mockFetchNotOk() {
  (global.fetch as jest.Mock).mockResolvedValue({ ok: false })
}

async function waitForBannerOrNot() {
  // Allow the useEffect fetch + state update to flush.
  await act(async () => { await Promise.resolve() })
  await act(async () => { await Promise.resolve() })
}

const validConfig = {
  message: "Test welcome message",
  id: "test-welcome-1",
  buttonText: "Feedback",
  buttonUrl: "https://example.com/feedback",
  buttonTarget: "_blank"
}

describe("AnnouncementBanner", () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove("has-announcement-banner")
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
    document.documentElement.classList.remove("has-announcement-banner")
  })

  describe("rendering / fetch", () => {
    it("renders nothing before fetch resolves", () => {
      mockFetchResolve(validConfig)
      render(<AnnouncementBanner />)
      expect(screen.queryByTestId("announcement-banner")).not.toBeInTheDocument()
    })

    it("renders nothing when fetch returns a non-ok response", async () => {
      mockFetchNotOk()
      render(<AnnouncementBanner />)
      await waitForBannerOrNot()
      expect(screen.queryByTestId("announcement-banner")).not.toBeInTheDocument()
    })

    it("renders nothing when fetch rejects (network error)", async () => {
      mockFetchReject(new Error("Network error"))
      render(<AnnouncementBanner />)
      await waitForBannerOrNot()
      expect(screen.queryByTestId("announcement-banner")).not.toBeInTheDocument()
    })

    it("renders nothing when fetched config has an invalid shape", async () => {
      mockFetchResolve({ not: "valid" })
      render(<AnnouncementBanner />)
      await waitForBannerOrNot()
      expect(screen.queryByTestId("announcement-banner")).not.toBeInTheDocument()
    })

    it("renders the message after fetch resolves successfully", async () => {
      mockFetchResolve(validConfig)
      render(<AnnouncementBanner />)
      expect(await screen.findByText("Test welcome message")).toBeInTheDocument()
    })

    it("renders https link segments in message as anchors", async () => {
      mockFetchResolve({
        ...validConfig,
        message: "Visit [our site](https://example.com) for more."
      })
      render(<AnnouncementBanner />)
      const link = await screen.findByRole("link", { name: "our site" })
      expect(link).toHaveAttribute("href", "https://example.com")
      expect(link).toHaveAttribute("target", "_blank")
      expect(link).toHaveAttribute("rel", "noopener noreferrer")
    })

    it("renders non-https links as plain text", async () => {
      mockFetchResolve({
        ...validConfig,
        message: "Visit [bad](http://evil.com) here."
      })
      render(<AnnouncementBanner />)
      expect(await screen.findByText(/\[bad\]\(http:\/\/evil\.com\)/)).toBeInTheDocument()
      expect(screen.queryByRole("link", { name: "bad" })).not.toBeInTheDocument()
    })

    it("renders Feedback button when buttonUrl is https", async () => {
      mockFetchResolve(validConfig)
      render(<AnnouncementBanner />)
      const button = await screen.findByTestId("announcement-banner-button")
      expect(button).toHaveAttribute("href", "https://example.com/feedback")
      expect(button).toHaveTextContent("Feedback")
    })

    it("omits the button when buttonUrl is missing", async () => {
      mockFetchResolve({ message: "Hi", id: "no-button" })
      render(<AnnouncementBanner />)
      await screen.findByText("Hi")
      expect(screen.queryByTestId("announcement-banner-button")).not.toBeInTheDocument()
    })

    it("omits the button when buttonUrl is not https", async () => {
      mockFetchResolve({ ...validConfig, buttonUrl: "http://example.com" })
      render(<AnnouncementBanner />)
      await screen.findByText("Test welcome message")
      expect(screen.queryByTestId("announcement-banner-button")).not.toBeInTheDocument()
    })
  })

  describe("dismiss behavior", () => {
    it("hides the banner when close (X) is clicked", async () => {
      mockFetchResolve(validConfig)
      render(<AnnouncementBanner />)
      await screen.findByTestId("announcement-banner")
      fireEvent.click(screen.getByTestId("announcement-banner-close"))
      expect(screen.queryByTestId("announcement-banner")).not.toBeInTheDocument()
    })

    it("close button does not persist dismissal in localStorage", async () => {
      mockFetchResolve(validConfig)
      render(<AnnouncementBanner />)
      await screen.findByTestId("announcement-banner")
      fireEvent.click(screen.getByTestId("announcement-banner-close"))
      expect(localStorage.getItem(`announcement-banner-dismissed-${validConfig.id}`)).toBeNull()
    })

    it("'Don't show again' persists dismissal and hides the banner", async () => {
      mockFetchResolve(validConfig)
      render(<AnnouncementBanner />)
      await screen.findByTestId("announcement-banner")
      fireEvent.click(screen.getByTestId("announcement-banner-dont-show"))
      expect(screen.queryByTestId("announcement-banner")).not.toBeInTheDocument()
      expect(localStorage.getItem(`announcement-banner-dismissed-${validConfig.id}`)).toBe("true")
    })

    it("does not render on second mount when dismissal is in localStorage", async () => {
      dismissBanner(validConfig.id)
      mockFetchResolve(validConfig)
      render(<AnnouncementBanner />)
      await waitForBannerOrNot()
      expect(screen.queryByTestId("announcement-banner")).not.toBeInTheDocument()
    })
  })

  describe("config gating", () => {
    it("does not render when enabled is false", async () => {
      mockFetchResolve({ ...validConfig, enabled: false })
      render(<AnnouncementBanner />)
      await waitForBannerOrNot()
      expect(screen.queryByTestId("announcement-banner")).not.toBeInTheDocument()
    })

    it("does not render when startDate is in the future", async () => {
      const future = Date.now() + 1000 * 60 * 60 * 24 * 365
      mockFetchResolve({ ...validConfig, startDate: future })
      render(<AnnouncementBanner />)
      await waitForBannerOrNot()
      expect(screen.queryByTestId("announcement-banner")).not.toBeInTheDocument()
    })

    it("does not render when endDate is in the past", async () => {
      mockFetchResolve({ ...validConfig, endDate: 1000000000000 })
      render(<AnnouncementBanner />)
      await waitForBannerOrNot()
      expect(screen.queryByTestId("announcement-banner")).not.toBeInTheDocument()
    })

    it("does not render when startDate > endDate (invalid range)", async () => {
      const now = Date.now()
      mockFetchResolve({ ...validConfig, startDate: now + 1000, endDate: now - 1000 })
      render(<AnnouncementBanner />)
      await waitForBannerOrNot()
      expect(screen.queryByTestId("announcement-banner")).not.toBeInTheDocument()
    })

    it("renders when current time is within [startDate, endDate]", async () => {
      const now = Date.now()
      const start = now - 1000 * 60
      const end = now + 1000 * 60 * 60
      mockFetchResolve({ ...validConfig, startDate: start, endDate: end })
      render(<AnnouncementBanner />)
      expect(await screen.findByTestId("announcement-banner")).toBeInTheDocument()
    })
  })

  describe("layout-shift class on <html>", () => {
    it("adds has-announcement-banner when banner is visible", async () => {
      mockFetchResolve(validConfig)
      render(<AnnouncementBanner />)
      await waitFor(() => {
        expect(document.documentElement.classList.contains("has-announcement-banner")).toBe(true)
      })
    })

    it("removes has-announcement-banner when banner is dismissed", async () => {
      mockFetchResolve(validConfig)
      render(<AnnouncementBanner />)
      await screen.findByTestId("announcement-banner")
      expect(document.documentElement.classList.contains("has-announcement-banner")).toBe(true)
      fireEvent.click(screen.getByTestId("announcement-banner-close"))
      expect(document.documentElement.classList.contains("has-announcement-banner")).toBe(false)
    })

    it("removes has-announcement-banner when component unmounts", async () => {
      mockFetchResolve(validConfig)
      const { unmount } = render(<AnnouncementBanner />)
      await screen.findByTestId("announcement-banner")
      expect(document.documentElement.classList.contains("has-announcement-banner")).toBe(true)
      unmount()
      expect(document.documentElement.classList.contains("has-announcement-banner")).toBe(false)
    })

    it("does not add has-announcement-banner when fetch returns null", async () => {
      mockFetchNotOk()
      render(<AnnouncementBanner />)
      await waitForBannerOrNot()
      expect(document.documentElement.classList.contains("has-announcement-banner")).toBe(false)
    })
  })

  describe("accessibility", () => {
    it("has role=status and aria-label", async () => {
      mockFetchResolve(validConfig)
      render(<AnnouncementBanner />)
      const banner = await screen.findByTestId("announcement-banner")
      expect(banner).toHaveAttribute("role", "status")
      expect(banner).toHaveAttribute("aria-label", "Announcement")
    })

    it("close button has aria-label", async () => {
      mockFetchResolve(validConfig)
      render(<AnnouncementBanner />)
      const closeButton = await screen.findByTestId("announcement-banner-close")
      expect(closeButton).toHaveAttribute("aria-label", "Close announcement")
    })
  })
})
