// Where a requester's default data context is kept. A plugin keeps it on its web view; the host page of an
// embedded CODAP, which has no tile, keeps it in the embedded server (see createDataContextLink).
export interface IDefaultDataContextLink {
  dataContextId?: string
  setDataContextId: (dataContextId?: string) => void
}

// The host page's link. It isn't part of the document, so undoing a create leaves the id of a data set that no
// longer exists, which resolves to nothing, and redo restores the same id.
export function createDataContextLink(): IDefaultDataContextLink {
  const link: IDefaultDataContextLink = {
    dataContextId: undefined,
    setDataContextId(dataContextId?: string) { link.dataContextId = dataContextId }
  }
  return link
}
