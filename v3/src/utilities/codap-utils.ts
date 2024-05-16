import { types } from "mobx-state-tree"

/**
 * Generates a CODAP v2-compatible numeric id as a string.
 *
 * @returns the generated id
 */
export function v3Id(prefix: string) {
  // The maximum representable integer in JavaScript is ~9e15.
  // We lower the ceiling a bit and raise the floor to avoid conflicting with
  // generated SproutCore ids which auto-increment from 1.
  const kFactor = 1e15
  const kOffset = 1e10
  return `${prefix}${Math.floor(kFactor * Math.random()) + kOffset}`
}

export function toV3Id(prefix: string, v2Id: number | string) {
  // If it's a non-numeric string, just return it
  if (typeof v2Id === "string" && !isFinite(+v2Id)) return v2Id
  return `${prefix}${v2Id}`
}

export const kAttrIdPrefix = "ATTR"
export const kCaseIdPrefix = "CASE"
export const kCollectionIdPrefix = "COLL"
export const kDataSetIdPrefix = "DATA"
export const kGlobalIdPrefix = "GLOB"

export const toV3AttrId = (v2Id: number | string) => toV3Id(kAttrIdPrefix, v2Id)
export const toV3CaseId = (v2Id: number | string) => toV3Id(kCaseIdPrefix, v2Id)
export const toV3CollectionId = (v2Id: number | string) => toV3Id(kCollectionIdPrefix, v2Id)
export const toV3DataSetId = (v2Id: number | string) => toV3Id(kDataSetIdPrefix, v2Id)
export const toV3GlobalId = (v2Id: number | string) => toV3Id(kGlobalIdPrefix, v2Id)

export function toV2Id(_v3Id: string) {
  // strip any prefix and return the numeric value of the rest
  const result = /[A-Za-z]*(\d+)/.exec(_v3Id)
  return +(result?.[1] ?? NaN)
}

export function maybeToV2Id(_v3Id?: string) {
  if (!_v3Id) return
  return toV2Id(_v3Id)
}

/**
 * This creates the definition for an identifier field in MST, which generates
 * a CODAP v2-compatible numeric id as a string if an id is not provided.
 *
 * @returns the generated id
 */
export function typeV3Id(prefix: string) {
  return types.optional(types.identifier, () => v3Id(prefix))
}
