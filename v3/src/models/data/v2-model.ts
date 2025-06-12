import { Instance, SnapshotIn, types } from "mobx-state-tree"
import { toV2Id, toV3DataSetId, toV3Id, typeV3Id } from "../../utilities/codap-utils"

export const V2Model = types.model("V2Model", {
  id: typeV3Id(""),
  // required for objects in documents
  name: "",
  _title: types.maybe(types.string)
})
.views(self => ({
  get title() {
    return self._title ?? self.name
  },
  get userSetTitle() {
    return self._title != null
  },
  matchNameOrId(nameOrId: string | number) {
    /* eslint-disable eqeqeq */
    return (!!self.name && self.name == nameOrId) ||
            (self.id == nameOrId) ||
            (self.id == toV3DataSetId(nameOrId)) ||
            (toV2Id(self.id) == nameOrId)
    /* eslint-enable eqeqeq */
  }
}))
.views(self => ({
  matchTitleOrNameOrId(titleOrNameOrId: string | number) {
    return (self.title && self.title === titleOrNameOrId) || self.matchNameOrId(titleOrNameOrId)
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
  name: string
  title?: string | null
}

export function isV2ModelSnapshot(snap?: any): snap is IV2ModelSnapshot {
  return snap?.guid != null
}

export function v2NameTitleToV3Title(name: string, v2Title?: string | null) {
  // only store the title if it's different than name
  return v2Title && v2Title !== name ? v2Title : undefined
}

export function v2ModelSnapshotFromV2ModelStorage(prefix: string, storage: Partial<V2ModelStorage>) {
  const { id, guid, name = "", title } = storage
  const v2ModelSnapshot: IV2ModelSnapshot = {
    id: id ? toV3Id(prefix, id) : guid ? toV3Id(prefix, guid) : undefined,
    name,
    _title: v2NameTitleToV3Title(name, title)
  }
  return v2ModelSnapshot
}
