import { Instance, SnapshotIn, SnapshotOut, types } from "mobx-state-tree"
import { SharedModel } from "../shared/shared-model"
import { GlobalValue, IGlobalValue, IGlobalValueSnapshot, kDefaultNamePrefix } from "./global-value"
import { ISharedModelManager } from "../shared/shared-model-manager"

export const kGlobalValueManagerType = "GlobalValueManager"

// manages all of the global values in a document
export const GlobalValueManager = SharedModel
.named("GlobalValueManager")
.props({
  type: types.optional(types.literal(kGlobalValueManagerType), kGlobalValueManagerType),
  globals: types.map(GlobalValue)
})
.views(self => ({
  get nameMap() {
    const names: Record<string, IGlobalValue> = {}
    self.globals.forEach(global => {
      names[global.name] = global
    })
    return names
  }
}))
.views(self => ({
  getValueById(id: string): IGlobalValue | undefined {
    return self.globals.get(id)
  },
  getValueByName(name: string): IGlobalValue | undefined {
    return self.nameMap[name]
  }
}))
.views(self => ({
  // returns a unique name within the context of the manager (e.g. a document)
  uniqueName(prefix = kDefaultNamePrefix) {
    let counter = 0
    let name
    do {
      ++counter
      name = prefix + counter
    } while (self.getValueByName(name))
    return name
  }
}))
.actions(self => ({
  addValue(global: IGlobalValue) {
    if (self.getValueByName(global.name)) {
      console.warn(`GlobalValueManager: Adding global value with conflicting name: ${global.name}`)
    }
    self.globals.put(global)
  },
  addValueSnapshot(global: IGlobalValueSnapshot) {
    if (self.getValueByName(global.name)) {
      console.warn(`GlobalValueManager: Adding global value with conflicting name: ${global.name}`)
    }
    return self.globals.put(global)
  },
  removeValue(global: IGlobalValue) {
    self.globals.delete(global.id)
  }
}))
export interface IGlobalValueManager extends Instance<typeof GlobalValueManager> {}
export interface IGlobalValueManagerSnapshot extends SnapshotIn<typeof GlobalValueManager> {}
export interface IGlobalValueManagerSnapshotOut extends SnapshotOut<typeof GlobalValueManager> {}

export function getGlobalValueManager(sharedModelManager?: ISharedModelManager) {
  return sharedModelManager?.getSharedModelsByType(kGlobalValueManagerType)?.[0] as IGlobalValueManager | undefined
}
