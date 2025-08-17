import { getSnapshot } from "mobx-state-tree"
import { cloneDeep } from "lodash"
import { CONFIG_SAVE_AS_V2 } from "../../lib/config"
import { ICodapV2DocumentJson } from "../../v2/codap-v2-types"
import { exportV2Document } from "../../v2/export-v2-document"
import { IDocumentModel, IDocumentModelSnapshot } from "./document"

export type ISerializedV3Document = IDocumentModelSnapshot & {revisionId?: string}
export type ISerializedV2Document = ICodapV2DocumentJson & {revisionId?: string}
export type ISerializedDocument = ISerializedV3Document | ISerializedV2Document

export async function serializeDocument<T>(document: IDocumentModel, serializeFn: (doc: IDocumentModel) => T) {
  try {
    await document.prepareSnapshot()

    // perform the serialization of the prepared document
    return serializeFn(document)
  }
  finally {
    document.completeSnapshot()
  }
}

// serialize a document in v2 format
export async function serializeCodapV2Document<T = ISerializedV2Document>(document: IDocumentModel): Promise<T> {
  // use cloneDeep because MST snapshots are immutable
  return serializeDocument(document, (doc: IDocumentModel) => exportV2Document(doc) as T)
}

// serialize a document in v3 format
export async function serializeCodapV3Document<T = ISerializedV3Document>(document: IDocumentModel): Promise<T> {
  // use cloneDeep because MST snapshots are immutable
  return serializeDocument(document, (doc: IDocumentModel) => cloneDeep(getSnapshot(doc)) as T)
}

// serialize a document in v2 or v3 format depending on configuration
export async function serializeCodapDocument(document: IDocumentModel): Promise<ISerializedDocument> {
  const serializeFn = CONFIG_SAVE_AS_V2
                        // export as v2 if configured to do so
                        ? serializeCodapV2Document<ISerializedDocument>
                        : serializeCodapV3Document<ISerializedDocument>
  return serializeDocument(document, serializeFn)
}
