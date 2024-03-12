import { IDocumentModel } from "./document"

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
