// Where a requester's default data context is kept. A plugin keeps it on its web view; the host page of an
// embedded CODAP, which has no tile, keeps it in the embedded server (see createDataContextLink).
export interface IDefaultDataContextLink {
  dataContextId?: string
  setDataContextId: (dataContextId?: string) => void
}

// The host page's link, not part of the document: deleting its data context leaves an id that resolves to nothing.
export function createDataContextLink(): IDefaultDataContextLink {
  const link: IDefaultDataContextLink = {
    dataContextId: undefined,
    setDataContextId(dataContextId?: string) { link.dataContextId = dataContextId }
  }
  return link
}
