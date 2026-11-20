import { ICoreNotifyFunctionEnv } from "./notification-core-types"
import { isDataContextChangeNotice } from "./notification-utils"

// Holds the notices sent while a change, or the synchronous part of a plugin's request, is being handled, and
// sends them when it ends, with the data context change notices for each data context combined into one. V2 did
// much the same: each applyChange queued its change and published it at the end of the outermost SproutCore run
// loop (data_context.js:456-473), whose notice held every change since the last one
// (notification_manager.js:186-235). Batches never span a wait, so nothing else is held up.

type NotifyFn = ICoreNotifyFunctionEnv["notify"]
type NotifyArgs = Parameters<NotifyFn>

interface IPendingNotice {
  notify: NotifyFn
  message: NotifyArgs[0]
  callbacks: Array<NotifyArgs[1]>
  targetTileId?: string
  excludeTileId?: string
}

let depth = 0
let pending: IPendingNotice[] = []

function canCombine(notice: IPendingNotice, notify: NotifyFn, message: NotifyArgs[0],
                    targetTileId?: string, excludeTileId?: string) {
  return notice.notify === notify && notice.message.action === message.action &&
    notice.message.resource === message.resource && notice.targetTileId === targetTileId &&
    notice.excludeTileId === excludeTileId
}

// Sends a notice now, or, while a batch is open, when the batch ends. A data context change notice joins an
// earlier one for the same data context and recipients, so it goes out in that notice's place.
export function sendNotice(notify: NotifyFn, message: NotifyArgs[0], callback: NotifyArgs[1],
                           targetTileId?: string, excludeTileId?: string) {
  if (!depth) {
    notify(message, callback, targetTileId, excludeTileId)
    return
  }
  if (isDataContextChangeNotice(message.resource)) {
    const earlier = pending.find(notice => isDataContextChangeNotice(notice.message.resource) &&
                                           canCombine(notice, notify, message, targetTileId, excludeTileId))
    if (earlier) {
      const values = ([] as any[]).concat(earlier.message.values, message.values)
      earlier.message = { ...earlier.message, values: values as unknown as NotifyArgs[0]["values"] }
      earlier.callbacks.push(callback)
      return
    }
  }
  pending.push({ notify, message, callbacks: [callback], targetTileId, excludeTileId })
}

function flush() {
  const notices = pending
  pending = []
  notices.forEach(({ notify, message, callbacks, targetTileId, excludeTileId }) => {
    const callback = callbacks.length === 1
                      ? callbacks[0]
                      : (response: any) => callbacks.forEach(aCallback => {
                          try {
                            aCallback(response)
                          } catch (error) {
                            console.warn("exception in notification callback", error)
                          }
                        })
    notify(message, callback, targetTileId, excludeTileId)
  })
}

export function beginNoticeBatch() {
  ++depth
}

export function endNoticeBatch() {
  if (depth > 0 && --depth === 0) flush()
}

export function withNoticeBatch<T>(fn: () => T): T {
  beginNoticeBatch()
  try {
    return fn()
  } finally {
    endNoticeBatch()
  }
}
