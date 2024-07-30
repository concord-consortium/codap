import { cloneDeep, each, isObject, isUndefined, unset } from "lodash"
import { IDocumentContentSnapshotIn } from "../models/document/document-content"

// Recursively removes properties whose values are undefined.
// The specified object is modified in place and returned.
// cf. https://stackoverflow.com/a/37250225
export const omitUndefined = (obj: any) => {
  obj = cloneDeep(obj)
  each(obj, (v, k) => {
    if (isUndefined(v)) {
      unset(obj, k)
    }
    else if (isObject(v)) {
      obj[k] = omitUndefined(v)
    }
  })
  return obj
}

export function createSingleTileContent(content: any): IDocumentContentSnapshotIn {
  const rowId = "row1"
  const tileId = "tile1"
  return {
    rowMap: {
      [rowId]: {
        id: rowId,
        tiles: [{ tileId }]
      }
    },
    rowOrder: [
      rowId
    ],
    tileMap: {
      [tileId]: {
        id: tileId,
        content
      }
    }
  }
}
