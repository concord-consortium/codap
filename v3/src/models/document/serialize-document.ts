import { IDocumentModel } from "./document"

export function serializeDocument<T>(document: IDocumentModel, serializeFn: () => T) {
  try {
    document.prepareSnapshot()

    // perform the serialization of the prepared document
    return serializeFn()
  }
  finally {
    document.completeSnapshot()
  }
}
