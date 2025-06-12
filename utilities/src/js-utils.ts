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

export function fooSpecial() {
  return "hello"
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
export function uniqueName(base: string, isValid: (name: string) => boolean, space = "") {
  if (isValid(base)) return base
  let name: string
  for (let i = 2; !isValid(name = `${base}${space}${i}`); ++i) {
    // nothing to do
  }
  return name
}

/*
 * safeDomIdentifier()
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

/*
 * isEquivalentArray()
 *
 * returns true if the contents of the arrays are identical according to ===
 */
export function isEquivalentArray<T = any>(array1: T[], array2: T[]) {
  return array1.length === array2.length &&
         array1.every((value, index) => value === array2[index])
}

/*
 * isEquivalentSet()
 *
 * returns true if the contents of the sets are identical
 */
export function isEquivalentSet<T = any>(set1: Set<T>, set2: Set<T>) {
  if (set1.size !== set2.size) return false
  for (const elem of set1) {
    if (!set2.has(elem)) return false
  }
  return true
}

/*
 * hashString()
 *
 * Returns a 32-bit hash value for a string.
 * Provided by ChatGPT, but apparently originally developed by Daniel J. Bernstein.
 */
export function hashString(str: string) {
  // Simple hash function for a single string (e.g., DJB2)
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    // eslint-disable-next-line no-bitwise
    hash = (hash * 33) ^ str.charCodeAt(i)
  }
  // eslint-disable-next-line no-bitwise
  return hash >>> 0 // Convert to unsigned 32-bit integer
}

/*
 * hashStringSet()
 *
 * returns an order-invariant hash value for a set of strings (e.g. ids).
 * developed with the help of ChatGPT.
 */
export function hashStringSet(strings: string[]) {
  return strings
    .map(hashString)
    // eslint-disable-next-line no-bitwise
    .reduce((acc, hash) => acc ^ hash, 0) // XOR all individual hashes
}

/*
 * hashStringSets()
 *
 * returns an order-invariant hash value for a set of string arrays (e.g. ids).
 * developed with the help of ChatGPT.
 */
export function hashStringSets(stringSets: Array<string[]>) {
  return stringSets
    .map(hashStringSet)
    // XOR all individual hashes with an index-based multiplier and a large initial value
    // eslint-disable-next-line no-bitwise
    .reduce((acc, hash, index) => acc ^ (hash * (index + 1)), 0x9e3779b9)
}

/*
 * hashOrderedStringSet()
 *
 * returns an order-dependent hash value for a set of strings (e.g. ids).
 * developed with the help of ChatGPT.
 */
export function hashOrderedStringSet(strings: string[]) {
  return strings
    .map((str, index) => hashString(str) * (index + 1)) // Multiply hash by index + 1 to reflect position
    .reduce((acc, hash) => acc + hash, 0) // sum all individual hashes
}
