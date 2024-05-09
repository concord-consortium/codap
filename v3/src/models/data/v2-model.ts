import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { typeCodapNumIdStr } from "../../utilities/mst-utils"

export const V2Model = types.model("V2Model", {
  id: typeCodapNumIdStr(),
  // required for objects in documents
  name: "",
  _title: types.maybe(types.string)
})
.views(self => ({
  get title() {
    return self._title ?? self.name
  },
  matchNameOrId(nameOrId: string | number) {
    // eslint-disable-next-line eqeqeq
    return (!!self.name && self.name == nameOrId) || (self.id == nameOrId)
  }
}))
.actions(self => ({
  // some models allow changing name
  setName(name: string) {
    self.name = name
  },
  setTitle(title?: string) {
    self._title = title
  }
}))
export interface IV2Model extends Instance<typeof V2Model> {}
export interface IV2ModelSnapshot extends SnapshotIn<typeof V2Model> {}

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
  const { id, guid, name = "", title } = storage
  const v2ModelSnapshot: IV2ModelSnapshot = {
    id: id ? `${id}` : guid ? `${guid}` : undefined,
    name,
    _title: v2NameTitleToV3Title(name, title)
  }
  return v2ModelSnapshot
}
