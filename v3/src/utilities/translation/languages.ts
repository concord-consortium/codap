import enUS from "./lang/en-US.json5"
import de from "./lang/de.json"
import el from "./lang/el.json"
import es from './lang/es.json'
import fa from "./lang/fa.json"
import he from "./lang/he.json"
import ja from "./lang/ja.json"
import ko from "./lang/ko.json"
import nb from "./lang/nb.json"
import nn from "./lang/nn.json"
import ptBR from "./lang/pt-BR.json"
import th from "./lang/th.json"
import tr from "./lang/tr.json"
import zhHans from "./lang/zh-Hans.json"
import zhTW from "./lang/zh-TW.json"

// returns baseLANG from baseLANG-REGION if REGION exists
// this will, for example, convert en-US to en
export const getBaseLanguage = (langKey: string) => {
  return langKey.split("-")[0]
}

type LanguageFileContent = Record<string, string>
interface LanguageFileEntry {
  key: string;
  contents: LanguageFileContent;
}

const languageFiles: LanguageFileEntry[] = [
  {key: 'de',       contents: de},      // German
  {key: 'el',       contents: el},      // Greek
  {key: 'en-US',    contents: enUS},    // US English
  {key: 'es',       contents: es},      // Spanish
  {key: 'fa',       contents: fa},      // Farsi (Persian)
  {key: 'he',       contents: he},      // Hebrew
  {key: 'ja',       contents: ja},      // Japanese
  {key: 'ko',       contents: ko},      // Korean
  {key: 'nb',       contents: nb},      // Norwegian Bokmål
  {key: 'nn',       contents: nn},      // Norwegian Nynorsk
  {key: 'pt-BR',    contents: ptBR},    // Brazilian Portuguese
  {key: 'th',       contents: th},      // Thai
  {key: 'tr',       contents: tr},      // Turkish
  {key: 'zh-Hans',  contents: zhHans},  // Simplified Chinese
  {key: 'zh-TW',    contents: zhTW}     // Traditional Chinese (Taiwan)
]

export const translations: Record<string, LanguageFileContent> = {}

languageFiles.forEach((langFile) => {
  translations[langFile.key] = langFile.contents
  // accept full key with region code or just the language code
  const bLang = getBaseLanguage(langFile.key)
  if (bLang && !translations[bLang]) {
    translations[bLang] = langFile.contents
  }
})

// Non-roman character languages require special styling so we add a class to
// components that use these languages.
export const getSpecialLangFontClassName = (lang: string) => {
  const specialLangFonts = ["fa", "th", "ja", "ko", "zhHans", "zhTW", "he"]
  return specialLangFonts.includes(lang) ? `lang-${lang}` : ""
}
