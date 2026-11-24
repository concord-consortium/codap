// PROTOTYPE: negative numbers show a true minus sign (U+2212), as in the spec ("−0.5"), not a hyphen.
// Fields accept either when typed.
export const kMinusSign = "−"

export function withMinusSign(text: string) {
  return text.replace(/-/g, kMinusSign)
}

export function withHyphen(text: string) {
  return text.replace(new RegExp(kMinusSign, "g"), "-")
}
