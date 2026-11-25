import { isPartnerFlagName, kFeatureFlags, PartnerFlagName, PartnerFlagType } from "./feature-flag-registry"

export interface IPartnerImage {
  // a plain file name in the partner config's own folder
  file: string
  alt: string
}

export interface IPartnerDocument {
  name: string
  url: string
  description?: string
}

export interface IPartnerFolder {
  name: string
  type: "folder"
  children: PartnerDocumentItem[]
}

// the cloud-file-manager read-only provider's list format, restricted to inline folders
export type PartnerDocumentItem = IPartnerDocument | IPartnerFolder

interface IPartnerFlagValueTypes {
  boolean: boolean
  string: string
  url: string
  image: IPartnerImage
  documents: PartnerDocumentItem[]
}

export type PartnerFlagValue<N extends PartnerFlagName> = IPartnerFlagValueTypes[(typeof kFeatureFlags)[N]["type"]]

export type PartnerFlagValues = { [N in PartnerFlagName]?: PartnerFlagValue<N> }

/*
 * jQuery's own test for a JSONP request (jQuery 3.7.1, src/ajax/jsonp.js). The
 * cloud-file-manager loads document links with `$.ajax({ dataType: "json" })`,
 * which jQuery turns into a <script> load when the whole url, fragment included,
 * matches this. Keep it identical to jQuery's.
 */
const kJsonpUrlRegex = /(=)\?(?=&|$)|\?\?/

// a plain name that can't reach another folder, with a raster extension; svg can run script when opened directly
const kPartnerImageFileRegex = /^[A-Za-z0-9][A-Za-z0-9_-]*\.(png|jpg|jpeg|gif|webp)$/i

// folders nested deeper than this are dropped; cloud-file-manager's recursion overflows the stack on deep lists
export const kMaxPartnerFolderDepth = 10

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== ""
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

/*
 * The `https://` prefix test is on the raw string because the url parser alone
 * accepts `https:example.org`, which a page resolves as a path on its own host.
 */
export function isValidPartnerUrl(value: unknown): value is string {
  if (typeof value !== "string" || !/^https:\/\//i.test(value)) return false
  try {
    new URL(value)
  }
  catch {
    return false
  }
  return !kJsonpUrlRegex.test(value)
}

export function isValidPartnerImageFile(value: unknown): value is string {
  return typeof value === "string" && kPartnerImageFileRegex.test(value)
}

function validateImage(value: unknown): IPartnerImage | undefined {
  if (!isObject(value)) return
  const { file, alt } = value
  if (!isValidPartnerImageFile(file) || !isNonBlankString(alt)) return
  return { file, alt }
}

function validateItem(item: unknown, depth: number): PartnerDocumentItem[] {
  if (!isObject(item) || !isNonBlankString(item.name)) return []
  const { name } = item
  if (item.type === "folder") {
    if (depth > kMaxPartnerFolderDepth) return []
    const children = validateItems(item.children, depth + 1)
    return children ? [{ name, type: "folder", children }] : []
  }
  if (!isValidPartnerUrl(item.url)) return []
  const { url, description } = item
  return [typeof description === "string" ? { name, url, description } : { name, url }]
}

// `depth` is the folder level the items sit in; the top-level list is level 1
function validateItems(value: unknown, depth: number): PartnerDocumentItem[] | undefined {
  if (!Array.isArray(value)) return
  return value.flatMap(item => validateItem(item, depth))
}

function validateDocuments(value: unknown): PartnerDocumentItem[] | undefined {
  const items = validateItems(value, 1)
  return items?.length ? items : undefined
}

const kPartnerFlagValidators: { [T in PartnerFlagType]: (value: unknown) => IPartnerFlagValueTypes[T] | undefined } = {
  boolean: value => typeof value === "boolean" ? value : undefined,
  string: value => isNonBlankString(value) ? value : undefined,
  url: value => isValidPartnerUrl(value) ? value : undefined,
  image: validateImage,
  documents: validateDocuments
}

/*
 * Reduces a partner config's `flags` object to the partner flag values that pass
 * their type's checks. Each value stands alone: an invalid one is dropped and the
 * rest still apply. Names that aren't partner flags, pilot flag names included,
 * are ignored, so a partner config can't turn on a pilot feature.
 */
export function validatePartnerFlags(flags: unknown): PartnerFlagValues {
  const values: PartnerFlagValues = {}
  if (!isObject(flags)) return values
  Object.entries(flags).forEach(([name, value]) => {
    if (!isPartnerFlagName(name)) return
    const valid = kPartnerFlagValidators[kFeatureFlags[name].type](value)
    if (valid !== undefined) Object.assign(values, { [name]: valid })
  })
  return values
}
