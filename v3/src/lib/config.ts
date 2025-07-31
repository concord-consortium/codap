import { isBeta } from "../utilities/version-utils"
import { DEBUG_SAVE_AS_V2 } from "./debug"

// For now, this is determined by DEBUG flag, but it may be configured by url parameter
// or some other means eventually.
export const CONFIG_SAVE_AS_V2 = DEBUG_SAVE_AS_V2 || isBeta()
