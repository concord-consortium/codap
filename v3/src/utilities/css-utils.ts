export function getNumericCssVariable(elt: Maybe<Element> | null, name: string): Maybe<number> {
  const value = elt ? parseFloat(getComputedStyle(elt).getPropertyValue(name)) : NaN
  return isFinite(value) ? value : undefined
}

export function getStringCssVariable(elt: Maybe<Element> | null, name: string): Maybe<string> {
  return elt ? getComputedStyle(elt).getPropertyValue(name) : undefined
}
