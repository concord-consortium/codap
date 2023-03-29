import { registerSharedModelInfo } from "../shared/shared-model-registry"
import { GlobalValueManager, kGlobalValueManagerType } from "./global-value-manager"

registerSharedModelInfo({
  type: kGlobalValueManagerType,
  modelClass: GlobalValueManager
})
