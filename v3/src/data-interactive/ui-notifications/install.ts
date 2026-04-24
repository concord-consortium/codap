import { installClickListener } from "./click-listener"
import { installDialogChangeObserver } from "./dialog-change-observer"
import { installDomObserver } from "./dom-observer"
import { installLayoutChangeReactions } from "./layout-change-reactions"
import { uiNotificationMonitorManager } from "./ui-notification-monitor-manager"

type Disposer = { uninstall(): void }

let installed: Disposer[] | undefined
let disposeSubscription: (() => void) | undefined

function installAll() {
  if (installed) return
  try {
    installed = [
      installDialogChangeObserver(uiNotificationMonitorManager),
      installDomObserver(uiNotificationMonitorManager),
      installClickListener(uiNotificationMonitorManager),
      installLayoutChangeReactions(uiNotificationMonitorManager)
    ]
  } catch (e) {
    console.error("[ui-notifications] install error", e)
  }
}

function uninstallAll() {
  if (!installed) return
  for (const d of installed) {
    try { d.uninstall() } catch (e) { console.error("[ui-notifications] uninstall error", e) }
  }
  installed = undefined
}

/** Lifecycle-managed observer attach: attaches on first subscriber, detaches on last unsubscribe.
 *  Idempotent: repeat calls (e.g. hot-reload) dispose the previous subscription before re-subscribing
 *  so installAll/uninstallAll is never wired up more than once.
 */
export function initializeUiNotifications() {
  disposeSubscription?.()
  disposeSubscription = uiNotificationMonitorManager.onSubscriberCountChange(count => {
    if (count > 0) installAll()
    else uninstallAll()
  })
}
