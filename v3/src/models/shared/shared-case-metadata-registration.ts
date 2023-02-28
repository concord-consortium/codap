import { kSharedCaseMetadataType, SharedCaseMetadata } from "./shared-case-metadata"
import { registerSharedModelInfo } from "./shared-model-registry"

registerSharedModelInfo({
  type: kSharedCaseMetadataType,
  modelClass: SharedCaseMetadata
})
