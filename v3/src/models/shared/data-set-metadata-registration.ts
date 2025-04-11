import { kDataSetMetadataType, DataSetMetadata } from "./data-set-metadata"
import { registerSharedModelInfo } from "./shared-model-registry"

registerSharedModelInfo({
  type: kDataSetMetadataType,
  modelClass: DataSetMetadata
})
