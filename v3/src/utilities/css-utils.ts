export function getNumericCssVariable(elt: Element | null, name: string) {
  const value = elt ? parseFloat(getComputedStyle(elt).getPropertyValue(name)) : NaN
  return isFinite(value) ? value : undefined
}
