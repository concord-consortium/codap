import { render, screen } from "@testing-library/react"
import { If } from "./if"

describe("If", () => {
  it("renders its children when the condition is true", () => {
    render(<If condition={true}>content</If>)

    expect(screen.getByText("content")).toBeInTheDocument()
  })

  it("renders nothing when the condition is false", () => {
    const { container } = render(<If condition={false}>content</If>)

    expect(screen.queryByText("content")).toBeNull()
    expect(container).toBeEmptyDOMElement()
  })

  it("renders multiple children", () => {
    render(
      <If condition={true}>
        <div>first</div>
        <div>second</div>
      </If>
    )

    expect(screen.getByText("first")).toBeInTheDocument()
    expect(screen.getByText("second")).toBeInTheDocument()
  })

  it("does not render child components when the condition is false", () => {
    const childSpy = jest.fn()
    const Child = () => { childSpy(); return <div>child</div> }

    render(<If condition={false}><Child /></If>)

    expect(childSpy).not.toHaveBeenCalled()
  })

  it("renders and unrenders as the condition changes", () => {
    const { rerender } = render(<If condition={false}>content</If>)
    expect(screen.queryByText("content")).toBeNull()

    rerender(<If condition={true}>content</If>)
    expect(screen.getByText("content")).toBeInTheDocument()

    rerender(<If condition={false}>content</If>)
    expect(screen.queryByText("content")).toBeNull()
  })

  it("renders nothing rather than a stray value for a falsy non-boolean condition", () => {
    // The motivating advantage over `&&`, which would render the 0 itself.
    const { container } = render(<If condition={0 as unknown as boolean}>content</If>)

    expect(container).toBeEmptyDOMElement()
  })

  it("supports nesting", () => {
    render(
      <If condition={true}>
        <If condition={true}>inner-shown</If>
        <If condition={false}>inner-hidden</If>
      </If>
    )

    expect(screen.getByText("inner-shown")).toBeInTheDocument()
    expect(screen.queryByText("inner-hidden")).toBeNull()
  })
})
