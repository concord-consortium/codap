import { getHistoryService } from "./history-service"

export function withoutUndo(options?: { suppressWarning?: boolean }) {
  getHistoryService().withoutUndo(options)
}
