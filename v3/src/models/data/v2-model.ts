import { Instance, SnapshotIn, types } from "mobx-state-tree"

export const V2Model = types.model("V2Model", {
  v2Id: types.maybe(types.number),
  // required for objects in documents
  name: "",
  _title: types.maybe(types.string)
})
.views(self => ({
  get title() {
    return self._title ?? self.name
  },
  matchNameOrId(nameOrId: string | number) {
    return (!!self.name && self.name === nameOrId) || (!!self.v2Id && self.v2Id === nameOrId)
  }
}))
.actions(self => ({
  // some models allow changing name
  setName(name: string) {
    self.name = name
  },
  setTitle(title: string) {
    self._title = title
  }
}))
// derived models are expected to have their own string `id` property
export interface IV2Model extends Instance<typeof V2Model> {
  id: string
}
export interface IV2ModelSnapshot extends SnapshotIn<typeof V2Model> {
  id?: string
}

export interface V2ModelStorage {
  id: number
  guid: number
  cid?: string | null
  name: string
  title?: string | null
}

export function isV2ModelSnapshot(snap?: any): snap is IV2ModelSnapshot {
  return snap?.guid != null || snap?.cid != null
}

export function v2NameTitleToV3Title(name: string, v2Title?: string | null) {
  // only store the title if it's different than name
  return v2Title && v2Title !== name ? v2Title : undefined
}

export function v2ModelSnapshotFromV2ModelStorage(storage: Partial<V2ModelStorage>) {
  const { id, guid, cid, name = "", title } = storage
  const v2ModelSnapshot: IV2ModelSnapshot = {
    id: cid ?? undefined,
    v2Id: id ?? guid,
    name,
    _title: v2NameTitleToV3Title(name, title)
  }
  return v2ModelSnapshot
}
