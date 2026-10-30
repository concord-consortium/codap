// Tracks the plugin tile whose request is currently being handled, so that data context change
// notices caused by a plugin's own request aren't sent back to that plugin (as in V2, where
// notification_manager.js skips changes whose requester is the receiving plugin).
//
// Only notices broadcast synchronously while the handler runs are attributed to the requester.
// Changes made after a handler awaits, from the UI, or by later reactions (e.g. formula
// recalculation) are sent to every plugin.

let requesterTileId: string | undefined

export function getNotificationRequesterTileId() {
  return requesterTileId
}

export function withNotificationRequester<T>(tileId: string | undefined, fn: () => T): T {
  const prevTileId = requesterTileId
  requesterTileId = tileId
  try {
    return fn()
  } finally {
    requesterTileId = prevTileId
  }
}
