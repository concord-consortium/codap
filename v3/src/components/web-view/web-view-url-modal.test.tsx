import { fireEvent, render, screen } from "@testing-library/react"
import { WebViewUrlModal } from "./web-view-url-modal"

function renderModal(overrides: Partial<Parameters<typeof WebViewUrlModal>[0]> = {}) {
  const onAccept = jest.fn()
  const onClose = jest.fn()
  const onRemoveEmptyWebView = jest.fn()
  render(
    <WebViewUrlModal
      currentValue=""
      isOpen={true}
      onAccept={onAccept}
      onClose={onClose}
      onRemoveEmptyWebView={onRemoveEmptyWebView}
      {...overrides}
    />
  )
  return { onAccept, onClose, onRemoveEmptyWebView }
}

function typeUrl(value: string) {
  const input = screen.getByTestId("web-view-url-input")
  fireEvent.change(input, { target: { value } })
}

describe("WebViewUrlModal URL validation", () => {
  it("accepts an https URL", () => {
    const { onAccept } = renderModal()
    typeUrl("https://example.com")
    expect(screen.queryByTestId("web-view-url-error")).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId("OK-button"))
    expect(onAccept).toHaveBeenCalledWith("https://example.com")
  })

  it("accepts a scheme-less domain (https:// is added downstream)", () => {
    const { onAccept } = renderModal()
    typeUrl("codap.concord.org")
    expect(screen.queryByTestId("web-view-url-error")).not.toBeInTheDocument()
    const okButton = screen.getByTestId("OK-button")
    expect(okButton).not.toBeDisabled()
    fireEvent.click(okButton)
    expect(onAccept).toHaveBeenCalledWith("codap.concord.org")
  })

  it("rejects a javascript: URL: shows an error, disables OK, and does not accept", () => {
    const { onAccept } = renderModal()
    typeUrl("javascript:alert(1)")
    expect(screen.getByTestId("web-view-url-error")).toBeInTheDocument()
    expect(screen.getByTestId("OK-button")).toBeDisabled()
    fireEvent.click(screen.getByTestId("OK-button"))
    expect(onAccept).not.toHaveBeenCalled()
  })

  it("does not accept a javascript: URL submitted via the Enter key", () => {
    const { onAccept } = renderModal()
    typeUrl("javascript:alert(1)")
    fireEvent.keyUp(screen.getByTestId("web-view-url-input"), { key: "Enter" })
    expect(onAccept).not.toHaveBeenCalled()
  })

  it("treats whitespace-only input as empty: OK disabled, no error, not accepted", () => {
    const { onAccept } = renderModal()
    typeUrl("   ")
    expect(screen.queryByTestId("web-view-url-error")).not.toBeInTheDocument()
    expect(screen.getByTestId("OK-button")).toBeDisabled()
    fireEvent.click(screen.getByTestId("OK-button"))
    expect(onAccept).not.toHaveBeenCalled()
  })

  it("trims surrounding whitespace before accepting", () => {
    const { onAccept } = renderModal()
    typeUrl("  https://example.com  ")
    fireEvent.click(screen.getByTestId("OK-button"))
    expect(onAccept).toHaveBeenCalledWith("https://example.com")
  })
})
