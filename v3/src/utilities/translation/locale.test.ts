import { Locale } from "./locale"

describe("Locale.currentBaseLanguage", () => {
  // Plugins built for V2 expect a 2-letter language code on the iframe `?lang=` query
  // param and in `localeChanged` notifications. Sending a region-qualified locale like
  // `en-US` causes some plugins (e.g. Simmer) to crash during initialization since their
  // string tables are keyed by 2-letter codes only. See CODAP-1219.
  it("returns the 2-letter base for a region-qualified locale", () => {
    const locale = new Locale()
    locale.setCurrent("en-US")
    expect(locale.currentBaseLanguage).toBe("en")
    locale.setCurrent("pt-BR")
    expect(locale.currentBaseLanguage).toBe("pt")
    locale.setCurrent("zh-Hans")
    expect(locale.currentBaseLanguage).toBe("zh")
  })

  it("returns 2-letter locales unchanged", () => {
    const locale = new Locale()
    locale.setCurrent("ja")
    expect(locale.currentBaseLanguage).toBe("ja")
    locale.setCurrent("es")
    expect(locale.currentBaseLanguage).toBe("es")
  })
})
