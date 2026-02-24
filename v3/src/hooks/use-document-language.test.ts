import { renderHook } from "@testing-library/react"
import { gLocale } from "../utilities/translation/locale"
import { useDocumentLanguage } from "./use-document-language"

describe("useDocumentLanguage", () => {
  afterEach(() => {
    gLocale.setCurrent("en-US")
  })

  it("sets document lang to the current locale on mount", () => {
    renderHook(() => useDocumentLanguage())
    expect(document.documentElement.lang).toBe("en-US")
  })

  it("updates document lang when locale changes", () => {
    renderHook(() => useDocumentLanguage())
    expect(document.documentElement.lang).toBe("en-US")
    gLocale.setCurrent("ja")
    expect(document.documentElement.lang).toBe("ja")
    gLocale.setCurrent("es")
    expect(document.documentElement.lang).toBe("es")
  })

  it("stops updating document lang after unmount", () => {
    const { unmount } = renderHook(() => useDocumentLanguage())
    expect(document.documentElement.lang).toBe("en-US")
    unmount()
    gLocale.setCurrent("ja")
    expect(document.documentElement.lang).toBe("en-US")
  })
})
