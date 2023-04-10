import {
  canonicalizeExpression, getEditableExpression, prettifyExpression, validateDisplayExpression
} from "./expression-utils"

describe("Expression Utilities", () => {
  it("getEditableExpression() works as expected", () => {
    expect(getEditableExpression("", "", "")).toBe("")
    expect(getEditableExpression("foo", "__x__", "foo")).toBe("foo")
    expect(getEditableExpression(undefined, "__x__", "foo")).toBe("foo")
  })

  it("canonicalizeExpression() works as expected", () => {
    expect(canonicalizeExpression("2 * 2", "")).toBe("2 * 2")
    expect(canonicalizeExpression("2 * 2", "foo")).toBe("(2 * 2)")
    expect(canonicalizeExpression("2 *", "foo")).toBe("2 *")
    expect(canonicalizeExpression("* foo", "foo")).toBe("* __x__")
    expect(canonicalizeExpression("2 * foo", "foo")).toBe("(2 * __x__)")
    expect(canonicalizeExpression("2 * foo + foo", "foo")).toBe("((2 * __x__) + __x__)")
    expect(canonicalizeExpression("2 * foo bar", "foo bar")).toBe("(2 * __x__)")
    expect(canonicalizeExpression("2 * foo bar + foo bar", "foo bar")).toBe("((2 * __x__) + __x__)")
    expect(canonicalizeExpression("2 * foo*bar + foo*bar", "foo*bar")).toBe("((2 * __x__) + __x__)")
  })

  it("prettifyExpression() works as expected", () => {
    expect(prettifyExpression(undefined, "")).toBe(undefined)
    expect(prettifyExpression("2 * 2", "")).toBe("2 * 2")
    expect(prettifyExpression("2 * 2", "foo")).toBe("2 * 2")
    expect(prettifyExpression("2 * __x__", "foo")).toBe("2 * foo")
    expect(prettifyExpression("2 * __x__ + __x__", "foo")).toBe("2 * foo + foo")
    expect(prettifyExpression("2 * __x__", "foo bar")).toBe("2 * foo bar")
    expect(prettifyExpression("2 * __x__ + __x__", "foo bar")).toBe("2 * foo bar + foo bar")
    expect(prettifyExpression("2 * __x__ + __x__", "foo*bar")).toBe("2 * foo*bar + foo*bar")
  })

  it("validateExpression() returns error message for invalid expressions, undefined for valid expressions", () => {
    expect(validateDisplayExpression("", "")).toBe(undefined)
    expect(validateDisplayExpression("2", "")).toBe(undefined)
    expect(validateDisplayExpression("2", "")).toBe(undefined)
    expect(validateDisplayExpression("", "foo")).toBe(undefined)
    expect(validateDisplayExpression("2", "foo")).toBe(undefined)
    expect(validateDisplayExpression("2 *", "foo")).toContain("Could not")
    expect(validateDisplayExpression("2 * foo", "foo")).toBe(undefined)
    expect(validateDisplayExpression("foo", "bar")).toContain("Unrecognized")
  })
})
