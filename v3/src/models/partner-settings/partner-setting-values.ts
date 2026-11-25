import {
  isPartnerSettingName, kPartnerSettings, PartnerSettingName, PartnerSettingType
} from "./partner-settings-registry"

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

interface IPartnerSettingValueTypes {
  boolean: boolean
  string: string
  url: string
  image: IPartnerImage
  documents: PartnerDocumentItem[]
}

export type PartnerSettingValue<N extends PartnerSettingName> =
  IPartnerSettingValueTypes[(typeof kPartnerSettings)[N]["type"]]

export type PartnerSettingValues = { [N in PartnerSettingName]?: PartnerSettingValue<N> }

/*
 * jQuery's own test for a JSONP request (jQuery 3.7.1, src/ajax/jsonp.js). The
 * cloud-file-manager loads document links with `$.ajax({ dataType: "json" })`,
 * which jQuery turns into a <script> load when the whole url, fragment included,
 * matches this. Keep it identical to jQuery's.
 */
const kJsonpUrlRegex = /(=)\?(?=&|$)|\?\?/

// a plain name that can't reach another folder, with a raster extension; svg can run script when opened directly
const kPartnerImageFileRegex = /^[A-Za-z0-9][A-Za-z0-9_-]*\.(png|jpg|jpeg|gif|webp)$/i

// without `<` or `>`, partner text can't form a tag even where a consumer renders it as HTML
const kMarkupCharRegex = /[<>]/

// folders nested deeper than this are dropped; cloud-file-manager's recursion overflows the stack on deep lists
export const kMaxPartnerFolderDepth = 10

function isPartnerText(value: unknown): value is string {
  return typeof value === "string" && !kMarkupCharRegex.test(value)
}

function isNonBlankPartnerText(value: unknown): value is string {
  return isPartnerText(value) && value.trim() !== ""
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
  let url: URL
  try {
    url = new URL(value)
  }
  catch {
    return false
  }
  // credentials let a link read as one host and go to another, e.g. https://concord.org@example.com
  if (url.username || url.password) return false
  return !kJsonpUrlRegex.test(value)
}

export function isValidPartnerImageFile(value: unknown): value is string {
  return typeof value === "string" && kPartnerImageFileRegex.test(value)
}

function validateImage(value: unknown): IPartnerImage | undefined {
  if (!isObject(value)) return
  const { file, alt } = value
  if (!isValidPartnerImageFile(file) || !isNonBlankPartnerText(alt)) return
  return { file, alt }
}

function validateItem(item: unknown, depth: number): PartnerDocumentItem[] {
  if (!isObject(item) || !isNonBlankPartnerText(item.name)) return []
  const { name } = item
  if (item.type === "folder") {
    if (depth > kMaxPartnerFolderDepth) return []
    const children = validateItems(item.children, depth + 1)
    return children ? [{ name, type: "folder", children }] : []
  }
  if (!isValidPartnerUrl(item.url)) return []
  const { url, description } = item
  return [isPartnerText(description) ? { name, url, description } : { name, url }]
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

const kPartnerSettingValidators:
  { [T in PartnerSettingType]: (value: unknown) => IPartnerSettingValueTypes[T] | undefined } = {
    boolean: value => typeof value === "boolean" ? value : undefined,
    string: value => isNonBlankPartnerText(value) ? value : undefined,
    url: value => isValidPartnerUrl(value) ? value : undefined,
    image: validateImage,
    documents: validateDocuments
  }

/*
 * Reduces a partner config's settings object to the values that pass their type's
 * checks. Each value stands alone: an invalid one is dropped and the rest still
 * apply. Names that aren't partner settings are ignored.
 */
export function validatePartnerSettings(settings: unknown): PartnerSettingValues {
  const values: PartnerSettingValues = {}
  if (!isObject(settings)) return values
  Object.entries(settings).forEach(([name, value]) => {
    if (!isPartnerSettingName(name)) return
    const valid = kPartnerSettingValidators[kPartnerSettings[name].type](value)
    if (valid !== undefined) Object.assign(values, { [name]: valid })
  })
  return values
}
