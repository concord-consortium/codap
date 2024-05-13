import { customAlphabet } from "nanoid"
// Use custom alphabet to avoid ambiguous characters, especially during mathematical formula evaluations.
// By default, nanoid uses "-" sign, which is used in formulas for subtraction.
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz", 21)

/*
 * hasOwnProperty()
 *
 * Replacement for Object.hasOwn -- returns true if the specified property is present
 * on the specified object, even if its value is `undefined`. See
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwn and
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwnProperty
 * for some of the subtleties here.
 */
export function hasOwnProperty(obj: object, property: string) {
  return Object.prototype.hasOwnProperty.call(obj, property)
}

/*
 * castArrayCopy()
 *
 * returns an array for simple items, and a copy of the array for arrays
 */
export function castArrayCopy(itemOrArray: any) {
  return Array.isArray(itemOrArray)
          ? itemOrArray.slice()
          : [itemOrArray]
}

/*
 * safeDecodeURI()
 *
 * returns the original string on error rather than throwing an exception
 */
export function safeDecodeURI(uriOrComponent: string) {
  let decoded: string | undefined
  try {
    decoded = decodeURIComponent(uriOrComponent)
  }
  catch (e) {
    // swallow errors
  }
  return decoded || uriOrComponent
}

/*
 * safeJsonParse()
 *
 * returns undefined on error rather than throwing an exception
 */
export function safeJsonParse<T = any>(json?: string) {
  let parsed
  try {
    parsed = json ? JSON.parse(json) as T: undefined
  }
  catch (e) {
    // swallow errors
  }
  return parsed
}

/*
 * typedId()
 *
 * returns a unique id string prepended with a supplied prefix
 */
export function typedId(type: string, idLength = 12): string {
  // cf. https://zelark.github.io/nano-id-cc/
  return `${type}${nanoid(idLength)}`
}

/*
 * uniqueId()
 *
 * returns a unique id string
 */
export function uniqueId(idLength = 16): string {
  // cf. https://zelark.github.io/nano-id-cc/
  return nanoid(idLength)
}

/*
 * uniqueName()
 *
 * returns a unique name from a given base name, adding a numeric suffix if necessary
 */
export function uniqueName(base: string, isValid: (name: string) => boolean) {
  if (isValid(base)) return base
  let name: string
  for (let i = 2; !isValid(name = `${base}${i}`); ++i) {
    // nothing to do
  }
  return name
}

/*
 * generateValidId()
 *
 * returns a value that can safely be used for an HTML ID or class name from a given value
 */
export function safeDomIdentifier(value: string) {
  // Replace spaces and non-alphanumeric characters with dashes
  const sanitizedValue = value.replace(/[^a-zA-Z0-9]/g, "-")

  // Ensure value doesn't start with a number
  const validId = sanitizedValue.replace(/^([0-9])/, "_$1")

  return validId
}
