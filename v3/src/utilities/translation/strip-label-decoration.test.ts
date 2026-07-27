import { stripLabelDecoration } from "./strip-label-decoration"

describe("stripLabelDecoration", () => {
  it("removes surrounding dashes and the whitespace around them", () => {
    expect(stripLabelDecoration("--- Insert Value ---")).toBe("Insert Value")
    expect(stripLabelDecoration("--- Wert einfügen ---")).toBe("Wert einfügen")
    expect(stripLabelDecoration("--- Εισαγωγή Τιμής ---")).toBe("Εισαγωγή Τιμής")
  })

  it("handles dashes with no adjacent whitespace", () => {
    // e.g. the Japanese and Chinese translations
    expect(stripLabelDecoration("---値の挿入---")).toBe("値の挿入")
    expect(stripLabelDecoration("---插入数值---")).toBe("插入数值")
  })

  it("handles a differing number of dashes", () => {
    // e.g. the Hebrew translation, which uses two
    expect(stripLabelDecoration("-- הכנס ערך --")).toBe("הכנס ערך")
  })

  it("leaves an undecorated label untouched", () => {
    expect(stripLabelDecoration("Insert Value")).toBe("Insert Value")
    expect(stripLabelDecoration("Insertar Valor")).toBe("Insertar Valor")
  })

  it("preserves hyphens inside the label", () => {
    expect(stripLabelDecoration("--- Insert Sub-Value ---")).toBe("Insert Sub-Value")
    expect(stripLabelDecoration("Insert Sub-Value")).toBe("Insert Sub-Value")
  })

  it("handles an empty string", () => {
    expect(stripLabelDecoration("")).toBe("")
  })
})
