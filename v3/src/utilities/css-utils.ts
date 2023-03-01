export function getCssVariable(elt: Element | null, name: string) {
  const value = elt ? getComputedStyle(elt).getPropertyValue(name) : undefined
  const parsed = value ? parseFloat(value) : NaN
  return isFinite(parsed) ? parsed : undefined
}
