import { fireEvent, render, screen } from "@testing-library/react"
import { ExternalLink } from "./external-link"

const kUrl = "https://example.com"

describe("ExternalLink", () => {
  it("opens in a new tab without giving the new page access to CODAP", () => {
    render(<ExternalLink href={kUrl} data-testid="test-link">Example</ExternalLink>)
    const link = screen.getByRole("link", { name: "Example (opens in a new tab)" })
    expect(link).toHaveAttribute("href", kUrl)
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("passes other anchor props through", () => {
    const onClick = jest.fn()
    render(
      <ExternalLink href={kUrl} className="my-link" data-testid="my-link" onClick={onClick}>Example</ExternalLink>
    )
    const link = screen.getByTestId("my-link")
    expect(link).toHaveClass("my-link")
    fireEvent.click(link)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("shows an arrow, hidden from screen readers, only when requested", () => {
    const { rerender } = render(<ExternalLink href={kUrl} data-testid="test-link">Example</ExternalLink>)
    expect(screen.queryByText("↗")).not.toBeInTheDocument()
    rerender(<ExternalLink href={kUrl} showArrow data-testid="test-link">Example</ExternalLink>)
    expect(screen.getByText("↗")).toHaveAttribute("aria-hidden", "true")
    expect(screen.getByRole("link", { name: "Example (opens in a new tab)" })).toBeInTheDocument()
  })
})
