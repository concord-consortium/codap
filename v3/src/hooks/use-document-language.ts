import { useLayoutEffect } from "react"
import { reaction } from "mobx"
import { gLocale } from "../utilities/translation/locale"

// Syncs the <html lang="..."> attribute with the current locale so screen readers
// apply the correct pronunciation rules (WCAG, CODAP-1064).
export function useDocumentLanguage() {
  useLayoutEffect(() => {
    return reaction(
      () => gLocale.current,
      lang => { document.documentElement.lang = lang },
      { fireImmediately: true }
    )
  }, [])
}
