import { action, computed, makeObservable, observable } from "mobx"
import { urlParams } from "../url-params"
import { getBaseLanguage, translations } from "./languages"

const urlLanguage = urlParams.lang as string | null || urlParams["lang-override"] as string | null || ""
const candidates = [urlLanguage, ...window.navigator.languages]
let defaultLang = "en-US"
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

export function getDefaultLanguage() {
  return defaultLang
}

export class Locale {
  @observable
  current: string

  collator?: Intl.Collator
  dateTimeFormats = new Map<string, Intl.DateTimeFormat>()
  numberFormats = new Map<string, Intl.NumberFormat>()

  constructor() {
    this.current = getDefaultLanguage()
    this.setCurrent(this.current)
    makeObservable(this)
  }

  @computed
  get currentBaseLanguage() {
    return getBaseLanguage(this.current)
  }

  @action
  setCurrent(_current: string) {
    this.collator = new Intl.Collator(_current, { sensitivity: "base" })
    this.dateTimeFormats.clear()
    this.numberFormats.clear()
    this.current = _current
  }

  compareStrings = (str1: string, str2: string) => {
    return this.collator?.compare(str1, str2) ?? 0
  }

  formatDate = (date?: Date | number, options: Intl.DateTimeFormatOptions = {}) => {
    const optionsStr = JSON.stringify(options)
    let formatter = this.dateTimeFormats.get(optionsStr)
    if (!formatter) {
      formatter = new Intl.DateTimeFormat(this.current, options)
      this.dateTimeFormats.set(optionsStr, formatter)
    }
    return formatter?.format(date)
  }

  formatNumber = (value: number, options: Intl.NumberFormatOptions = {}) => {
    const optionsStr = JSON.stringify(options)
    let formatter = this.numberFormats.get(optionsStr)
    if (!formatter) {
      formatter = new Intl.NumberFormat(this.current, options)
      this.numberFormats.set(optionsStr, formatter)
    }
    return formatter?.format(value)
  }
}

export const gLocale = new Locale()
