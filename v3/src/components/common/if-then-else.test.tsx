import { render, screen } from "@testing-library/react"
import { Else, IfThenElse, Then } from "./if-then-else"

describe("IfThenElse", () => {
  it("renders the Then branch and not the Else branch when the condition is true", () => {
    render(
      <IfThenElse condition={true}>
        <Then>then-content</Then>
        <Else>else-content</Else>
      </IfThenElse>
    )

    expect(screen.getByText("then-content")).toBeInTheDocument()
    expect(screen.queryByText("else-content")).toBeNull()
  })

  it("renders the Else branch and not the Then branch when the condition is false", () => {
    render(
      <IfThenElse condition={false}>
        <Then>then-content</Then>
        <Else>else-content</Else>
      </IfThenElse>
    )

    expect(screen.getByText("else-content")).toBeInTheDocument()
    expect(screen.queryByText("then-content")).toBeNull()
  })

  it("renders branches nested below the direct children of IfThenElse", () => {
    render(
      <IfThenElse condition={true}>
        <div>
          <span>
            <Then>nested-then</Then>
          </span>
        </div>
        <div>
          <Else>nested-else</Else>
        </div>
      </IfThenElse>
    )

    expect(screen.getByText("nested-then")).toBeInTheDocument()
    expect(screen.queryByText("nested-else")).toBeNull()
  })

  it("allows a branch to be omitted", () => {
    const { rerender } = render(
      <IfThenElse condition={false}>
        <Then>then-content</Then>
      </IfThenElse>
    )
    expect(screen.queryByText("then-content")).toBeNull()

    rerender(
      <IfThenElse condition={true}>
        <Then>then-content</Then>
      </IfThenElse>
    )
    expect(screen.getByText("then-content")).toBeInTheDocument()
  })

  it("does not render components in the branch that isn't taken", () => {
    const thenSpy = jest.fn()
    const elseSpy = jest.fn()
    const ThenChild = () => { thenSpy(); return <div>then-child</div> }
    const ElseChild = () => { elseSpy(); return <div>else-child</div> }

    render(
      <IfThenElse condition={true}>
        <Then><ThenChild /></Then>
        <Else><ElseChild /></Else>
      </IfThenElse>
    )

    expect(thenSpy).toHaveBeenCalled()
    expect(elseSpy).not.toHaveBeenCalled()
  })

  it("swaps branches when the condition changes", () => {
    const { rerender } = render(
      <IfThenElse condition={true}>
        <Then>then-content</Then>
        <Else>else-content</Else>
      </IfThenElse>
    )
    expect(screen.getByText("then-content")).toBeInTheDocument()

    rerender(
      <IfThenElse condition={false}>
        <Then>then-content</Then>
        <Else>else-content</Else>
      </IfThenElse>
    )
    expect(screen.getByText("else-content")).toBeInTheDocument()
    expect(screen.queryByText("then-content")).toBeNull()
  })

  it("supports nested IfThenElse, with each branch bound to its nearest condition", () => {
    render(
      <IfThenElse condition={true}>
        <Then>
          <IfThenElse condition={false}>
            <Then>inner-then</Then>
            <Else>inner-else</Else>
          </IfThenElse>
        </Then>
        <Else>outer-else</Else>
      </IfThenElse>
    )

    expect(screen.getByText("inner-else")).toBeInTheDocument()
    expect(screen.queryByText("inner-then")).toBeNull()
    expect(screen.queryByText("outer-else")).toBeNull()
  })

  describe("used outside of an IfThenElse", () => {
    beforeEach(() => {
      // React logs the error it re-throws; silence it to keep the test output readable.
      jest.spyOn(console, "error").mockImplementation(() => null)
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it("throws for a stray Then", () => {
      expect(() => render(<Then>then-content</Then>))
        .toThrow(/<Then> must be rendered inside <IfThenElse>/)
    })

    it("throws for a stray Else", () => {
      expect(() => render(<Else>else-content</Else>))
        .toThrow(/<Else> must be rendered inside <IfThenElse>/)
    })
  })
})
