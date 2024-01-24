import { IDocumentModel } from "./document"

export function serializeDocument<T>(document: IDocumentModel, serializeFn: (doc: IDocumentModel) => T) {
  try {
    document.prepareSnapshot()

    // perform the serialization of the prepared document
    return serializeFn(document)
  }
  finally {
    document.completeSnapshot()
  }
}
