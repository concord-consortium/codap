import {urlParams} from "../url-params"

import enUS from "./lang/en-US.json5"
import de from "./lang/de.json"
import el from "./lang/el.json"
import es from './lang/es.json'
import fa from "./lang/fa.json"
import he from "./lang/he.json"
import ja from "./lang/ja.json"
import nb from "./lang/nb.json"
import nn from "./lang/nn.json"
import ptBR from "./lang/pt-BR.json"
import th from "./lang/th.json"
import tr from "./lang/tr.json"
import zhHans from "./lang/zh-Hans.json"
import zhTW from "./lang/zh-TW.json"

type LanguageFileContent = Record<string, string>
interface LanguageFileEntry {
  key: string;
  contents: LanguageFileContent;
}

const languageFiles: LanguageFileEntry[] = [
  {key: 'de',    contents: de},     // German
  {key: 'el',    contents: el},     // Greek
  {key: 'en-US', contents: enUS},   // US English
  {key: 'es',    contents: es},     // Spanish
  {key: 'fa',    contents: fa},     // Farsi (Persian)
  {key: 'he',    contents: he},     // Hebrew
  {key: 'ja',    contents: ja},     // Japanese
  {key: 'nb',    contents: nb},     // Norwegian Bokmål
  {key: 'nn',    contents: nn},     // Norwegian Nynorsk
  {key: 'pt-BR', contents: ptBR},   // Brazilian Portuguese
  {key: 'th',    contents: th},     // Thai
  {key: 'tr',    contents: tr},     // Turkish
  {key: 'zh',    contents: zhHans}, // Simplified Chinese
  {key: 'zh-TW', contents: zhTW}    // Traditional Chinese (Taiwan)
]

// returns baseLANG from baseLANG-REGION if REGION exists
// this will, for example, convert en-US to en
const getBaseLanguage = (langKey: string) => {
  return langKey.split("-")[0]
}

const translations: Record<string, LanguageFileContent> = {}

languageFiles.forEach((langFile) => {
  translations[langFile.key] = langFile.contents
  // accept full key with region code or just the language code
  const bLang = getBaseLanguage(langFile.key)
  if (bLang && !translations[bLang]) {
    translations[bLang] = langFile.contents
  }
})

// supports named variables (e.g. %{foo}) and SproutCore numbered variables (e.g. %@1)
const varRegExp = /%({\s*([^}\s]*)\s*}|@(\d*))/g

const urlLanguage = urlParams.lang as string | null || urlParams["lang-override"] as string | null || ""
const candidates = [urlLanguage, ...window.navigator.languages]
let defaultLang = "en"
for (const lang of candidates) {
  if (lang && translations[lang]) {
    defaultLang = lang
    break
  }
  if (lang && translations[getBaseLanguage(lang)]) {
    defaultLang = getBaseLanguage(lang)
    break
  }
}

export function getDefaultLanguage () {
  return defaultLang
}

type VarValue = string | number | undefined
interface ITranslateOptions {
  lang?: string
  count?: number
  vars?: Record<string, VarValue> | Array<VarValue> // CODAP v2 uses positional replacement
}

export function translate (key: string, options?: ITranslateOptions) {
  const lang = options?.lang || defaultLang
  const namedVars = Array.isArray(options?.vars) ? {} : options?.vars || {}
  const posVars = Array.isArray(options?.vars) ? options?.vars || [] : []
  // default to English if we don't have a translated string
  // default to the key if we don't have an English string
  const translation = translations[lang]?.[key] || translations.en?.[key] || key
  // match: full match (e.g. "%{foo}", "%@", "%@1")
  // param: full match without % (e.g. "{foo}", "@", "@1")
  // varName: name in case of named variables (e.g. "foo", null, null)
  // varPos: position in case of positional variables (e.g. null, null, "1")
  let matchIndex = -1
  function replaceFn(match: string, param: string | null, varName: string | null, varPos: string | null) {
    const valueStr = (value: VarValue) => value == null ? "" : `${value}`
    ++matchIndex
    if (varName) {
      !Object.prototype.hasOwnProperty.call(namedVars, varName) &&
        console.warn(`translate: no replacement for "${varName}" in "${key}"`)
      return valueStr(namedVars[varName])
    }
    if (varPos) {
      const varIndex = +varPos - 1
      ;(varIndex >= posVars.length) &&
        console.warn(`translate: no replacement for "${varPos}" in "${key}"`)
      return valueStr(posVars[varIndex])
    }
    if (param === "@") {
      (matchIndex >= posVars.length) &&
        console.warn(`translate: no replacement for "@" at index ${matchIndex + 1} in "${key}"`)
      return valueStr(posVars[matchIndex])
    }
    // should only get here for pathological cases (e.g. "%{}")
    console.warn(`translate: no replacement for variable match "${match}" in "${key}"`)
    return ""
  }
  return translation.replace(varRegExp, replaceFn)
}

export const t = translate
