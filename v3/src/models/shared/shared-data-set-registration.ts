import { kSharedDataSetType, SharedDataSet } from "./shared-data-set"
import { registerSharedModelInfo } from "./shared-model-registry"

registerSharedModelInfo({
  type: kSharedDataSetType,
  modelClass: SharedDataSet
})
