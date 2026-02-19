import { t } from "./translate"

jest.mock("../url-params", () => ({
  urlParams: { lang: "es-mx" }
}))

jest.mock("./lang/en-US.json5", () => ({
  HELLO: "Hello",
  MISSING: "missing"
}))

jest.mock("./lang/es.json", () => ({
  HELLO: "Hola"
}))

describe("Spanish strings", () => {
  it("returns Spanish strings when specified by url parameter", () => {
    expect(t("HELLO")).toBe("Hola")
  })
  it("defaults to English if no localized string is available", () => {
    expect(t("MISSING")).toBe("missing")
  })
  it("allows overriding default language with parameter", () => {
    expect(t("HELLO", { lang: "en" })).toBe("Hello")
  })
})
