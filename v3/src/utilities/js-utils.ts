import { customAlphabet } from "nanoid"
import { monotonicFactory } from "ulid"
const ulid = monotonicFactory()
// Use custom alphabet to avoid ambiguous characters, especially during mathematical formula evaluations.
// By default, nanoid uses "-" sign, which is used in formulas for subtraction.
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz", 21)

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
 * uniqueOrderedId()
 *
 * returns a unique id string ordered by creation
 */
export function uniqueOrderedId(): string {
  return ulid()
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
