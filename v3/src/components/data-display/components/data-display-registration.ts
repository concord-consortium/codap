import { registerComponentHandler } from "../../../data-interactive/handlers/component-handler"
import { componentImageSnapshotHandler } from "../../../data-interactive/handlers/component-image-snapshot-handler"

registerComponentHandler("dataDisplay", componentImageSnapshotHandler)
