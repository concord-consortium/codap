import t from "./translate"

jest.mock("./lang/en-US.json5", () => ({
  HELLO: "Hello",
  NAMED: "Replace %{foo} with %{bar}",
  INDEXED: "Replace %@1 with %@2",
  REVERSED: "Replace %@2 with %@1",
  POSITIONED: "Replace %@ with %@",
  EMPTY_NAMED: "Replace %{foo} with %{}"
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
    expect(t("NAMED", { vars: { foo: "foo", bar: "bar" }})).toBe("Replace foo with bar")
  })
  it("supports indexed replacement strings", () => {
    expect(t("INDEXED", { vars: ["foo", "bar"] })).toBe("Replace foo with bar")
  })
  it("supports reversed indexed replacement strings", () => {
    expect(t("REVERSED", { vars: ["foo", "bar"] })).toBe("Replace bar with foo")
  })
  it("supports positioned replacement strings", () => {
    expect(t("POSITIONED", { vars: ["foo", "bar"] })).toBe("Replace foo with bar")
  })
  it("warns on empty named replacement strings", () => {
    const spy = jest.spyOn(global.console, "warn").mockImplementation(() => null)
    expect(t("EMPTY_NAMED", { vars: { foo: "foo", bar: "bar" }})).toBe("Replace foo with ")
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
