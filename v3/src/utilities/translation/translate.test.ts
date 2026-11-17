import { render, screen } from "@testing-library/react"
import { createElement, ReactNode } from "react"
import { t, translateToElements } from "./translate"

jest.mock("./lang/en-US.json5", () => ({
  HELLO: "Hello",
  NAMED: "Replace %{foo} with %{bar}",
  INDEXED: "Replace %@1 with %@2",
  REVERSED: "Replace %@2 with %@1",
  POSITIONED: "Replace %@ with %@",
  EMPTY_NAMED: "Replace %{foo} with %{}",
  SENTENCE: "Read the %{link} before %{action}.",
  EDGES: "%{action}, then read the %{link}",
  PLAIN: "No placeholders here"
}))

jest.mock("./lang/es.json", () => ({
  HELLO: "Hola"
}))

describe("English strings", () => {
  it("returns English strings by default", () => {
    expect(t("HELLO")).toBe("Hello")
  })
  it("returns key if no translation is available", () => {
    expect(t("MISSING")).toBe("MISSING")
  })
  it("supports named replacement strings", () => {
    expect(t("NAMED", { vars: { foo: "foo", bar: 0 }})).toBe("Replace foo with 0")
  })
  it("supports indexed replacement strings", () => {
    expect(t("INDEXED", { vars: ["foo", 0] })).toBe("Replace foo with 0")
  })
  it("supports reversed indexed replacement strings", () => {
    expect(t("REVERSED", { vars: ["foo", 0] })).toBe("Replace 0 with foo")
  })
  it("supports positioned replacement strings", () => {
    expect(t("POSITIONED", { vars: ["foo", 0] })).toBe("Replace foo with 0")
  })
  it("warns on empty named replacement strings", () => {
    const spy = jest.spyOn(global.console, "warn").mockImplementation(() => null)
    expect(t("EMPTY_NAMED", { vars: { foo: "foo", bar: 0 }})).toBe("Replace foo with ")
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })
  it("warns on missing named replacement strings", () => {
    const spy = jest.spyOn(global.console, "warn").mockImplementation(() => null)
    expect(t("NAMED")).toBe("Replace  with ")
    expect(t("NAMED", { vars: {} })).toBe("Replace  with ")
    expect(t("NAMED", { vars: [] })).toBe("Replace  with ")
    expect(spy).toHaveBeenCalledTimes(6)
    spy.mockRestore()
  })
  it("warns on missing indexed replacement strings", () => {
    const spy = jest.spyOn(global.console, "warn").mockImplementation(() => null)
    expect(t("INDEXED")).toBe("Replace  with ")
    expect(t("INDEXED", { vars: [] })).toBe("Replace  with ")
    expect(t("INDEXED", { vars: {} })).toBe("Replace  with ")
    expect(spy).toHaveBeenCalledTimes(6)
    spy.mockRestore()
  })
  it("warns on missing positional replacement strings", () => {
    const spy = jest.spyOn(global.console, "warn").mockImplementation(() => null)
    expect(t("POSITIONED")).toBe("Replace  with ")
    expect(t("POSITIONED", { vars: [] })).toBe("Replace  with ")
    expect(t("POSITIONED", { vars: {} })).toBe("Replace  with ")
    expect(spy).toHaveBeenCalledTimes(6)
    spy.mockRestore()
  })
})

describe("translateToElements", () => {
  const link = createElement("a", { href: "https://example.com" }, "guide")
  const action = createElement("strong", null, "starting")

  function showInParagraph(content: ReactNode[]) {
    render(createElement("p", { "data-testid": "text" }, ...content))
    return screen.getByTestId("text")
  }

  it("replaces placeholders with elements and keeps the surrounding text", () => {
    const paragraph = showInParagraph(translateToElements("SENTENCE", { link, action }))
    expect(paragraph).toHaveTextContent("Read the guide before starting.")
    expect(screen.getByRole("link", { name: "guide" })).toHaveAttribute("href", "https://example.com")
    expect(screen.getByText("starting", { selector: "strong" })).toBeInTheDocument()
  })

  it("handles placeholders at the start and end of the string", () => {
    const paragraph = showInParagraph(translateToElements("EDGES", { link, action }))
    expect(paragraph).toHaveTextContent("starting, then read the guide")
  })

  it("returns the plain string when there are no placeholders", () => {
    expect(translateToElements("PLAIN", {})).toEqual(["No placeholders here"])
  })

  it("renders a placeholder with no matching element as empty and warns", () => {
    const spy = jest.spyOn(global.console, "warn").mockImplementation(() => null)
    const paragraph = showInParagraph(translateToElements("SENTENCE", { link }))
    expect(paragraph).toHaveTextContent("Read the guide before .")
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })
})
