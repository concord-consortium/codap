import { types, IJsonPatch, SnapshotIn, Instance } from "mobx-state-tree"
import { observable } from "mobx"
import { IClientUndoData, ICustomPatch } from "./tree-types"

export const TreePatchRecord = types.model("TreePatchRecord", {
  tree: types.string,
  action: types.string,
  patches: types.frozen<ReadonlyArray<IJsonPatch>>(),
  inversePatches: types.frozen<ReadonlyArray<IJsonPatch>>()
})
.views(self => ({
  getPatches(opType: HistoryOperation) {
    switch (opType) {
      case HistoryOperation.Undo:
        return self.inversePatches.slice().reverse()
      case HistoryOperation.Redo:
        return self.patches
    }
  }
}))
export interface TreePatchRecordSnapshot extends SnapshotIn<typeof TreePatchRecord> {}

export interface ICreateHistoryEntry {
  id: string
  exchangeId: string
  tree: string
  model: string
  action: string
  noDirty?: boolean
  undoable: boolean
  customPatches?: ICustomPatch[]
  clientData?: IClientUndoData
}

export const HistoryEntry = types.model("HistoryEntry", {
  id: types.identifier,
  tree: types.maybe(types.string),
  model: types.maybe(types.string),   // name of model
  action: types.maybe(types.string),  // name of action
  // These don't need to be recorded in the state, but putting them here is
  // the easiest place for now.
  noDirty: types.maybe(types.boolean),
  undoable: types.maybe(types.boolean),
  // other standard properties
  created: types.optional(types.Date, () => new Date()),
  records: types.array(TreePatchRecord),
  customPatches: types.maybe(types.frozen<ReadonlyArray<ICustomPatch>>()),
  clientData:types.maybe(types.frozen<IClientUndoData>()),
  // History entries are marked as recording, until all records have been added
  state: types.optional(types.enumeration("HistoryEntryState", ["recording", "complete"]), "recording")
})
.volatile(self => ({
  // The value of the map should be the name of the exchange. This is useful
  // for debugging an activeExchange that hasn't been ended.
  // The {name: "activeExchanges"} is a feature of MobX that can also
  // help with debugging.
  activeExchanges: observable.map<string, string>({}, {name: "activeExchanges"})
}))
.views(self => ({
  get modelActionKey() {
    const modelName = self.model ?? "UnknownModel"
    const pathParts = self.action?.split("/") ?? []
    const actionName = pathParts.length ? pathParts[pathParts.length - 1] : "unknownAction"
    return `${modelName}.${actionName}`
  }
}))
export interface HistoryEntrySnapshot extends SnapshotIn<typeof HistoryEntry> {}
export interface HistoryEntryType extends Instance<typeof HistoryEntry> {}

export enum HistoryOperation {
  Undo = "undo",
  Redo = "redo"
}
