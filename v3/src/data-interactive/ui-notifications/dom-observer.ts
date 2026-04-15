import { onDialogAppear, onDialogDisappear } from "./dialog-change-observer"
import { getRecentClick } from "./click-listener"
import {
  buildTarget, classifyNode, findMarkers, isHiddenSubtree, kCfmDialogSelector, kMarkerSelector
} from "./classify-node"
import { UiNotificationMonitorManager } from "./ui-notification-monitor-manager"
import { UiNotice, UiTarget } from "./ui-notification-types"

export interface DomObserverInstalled {
  uninstall(): void
  getAppearanceCount(): number
  resetDiagnostics(): void
}

function emitAppearOrDisappear(
  manager: UiNotificationMonitorManager,
  event: "appear" | "disappear",
  el: Element
) {
  const cls = classifyNode(el, { recentClick: getRecentClick() })
  const target: UiTarget = buildTarget(el)
  const notice: UiNotice = {
    eventType: event,
    region: cls.region,
    target: {
      ...target,
      ...(cls.componentId ? { componentId: cls.componentId } : target.componentId ? {} : {})
    },
    monitor: { id: -1 }
  } as UiNotice
  manager.deliver(notice)
  // Dialog-change hook
  try {
    const appearTarget = notice.eventType === "appear" || notice.eventType === "disappear"
      ? notice.target : undefined
    if (event === "appear" && (el.matches?.(kCfmDialogSelector) || el.matches?.(".chakra-modal__content"))) {
      onDialogAppear(el, appearTarget)
    } else if (event === "disappear" &&
      (el.matches?.(kCfmDialogSelector) || el.matches?.(".chakra-modal__content"))) {
      onDialogDisappear(el)
    }
  } catch { /* ignore */ }
}

export function installDomObserver(manager: UiNotificationMonitorManager): DomObserverInstalled {
  let appearanceCount = 0
  const ariaExpandedMap = new WeakMap<Element, string | null>()
  // Element-level dedup to suppress double-counting when the same node is reached via
  // both a container's descendant walk and the node's own subsequent childList mutation.
  // React Aria menus in particular stream menuitems in after the wrapper attach, so the
  // descendant walk of the wrapper AND the individual appends would each emit an `appear`
  // for the same element. Tracking recent per-element emissions collapses those to one.
  const kRecentEmitWindowMs = 500
  const recentEmits = new Map<Element, { event: "appear" | "disappear"; ts: number }>()
  function shouldSuppressEmit(event: "appear" | "disappear", el: Element): boolean {
    const now = Date.now()
    // Sweep stale entries
    for (const [k, v] of recentEmits) {
      if (now - v.ts > kRecentEmitWindowMs) recentEmits.delete(k)
    }
    const prev = recentEmits.get(el)
    if (prev?.event === event && now - prev.ts < kRecentEmitWindowMs) return true
    recentEmits.set(el, { event, ts: now })
    return false
  }

  const observer = new MutationObserver(records => {
    for (const r of records) {
      try {
        if (r.type === "attributes") {
          if (r.attributeName === "aria-expanded") {
            handleAriaExpanded(r.target as Element)
          }
          // aria-hidden, aria-disabled, disabled, style — observed for fast-path / filtering,
          // no independent appear/disappear emission
          continue
        }
        if (r.type === "childList") {
          for (const n of Array.from(r.addedNodes)) {
            if (n.nodeType !== 1) continue
            processAdded(n as Element)
          }
          for (const n of Array.from(r.removedNodes)) {
            if (n.nodeType !== 1) continue
            processRemoved(n as Element)
          }
        }
      } catch (e) {
        console.error("[ui-notifications] observer callback error", e)
      }
    }
  })

  function handleAriaExpanded(el: Element) {
    if (!el) return
    if (isHiddenSubtree(el)) return
    const prev = ariaExpandedMap.get(el) ?? null
    const cur = el.getAttribute("aria-expanded")
    ariaExpandedMap.set(el, cur)
    if (prev === cur) return
    const hasPopup = el.getAttribute("aria-haspopup")
    const role = el.getAttribute("role")
    const isTrigger = hasPopup === "true" || hasPopup === "menu" || hasPopup === "dialog" ||
      role === "combobox"
    if (!isTrigger) return
    const event = cur === "true" ? "appear" : "disappear"
    if (shouldSuppressEmit(event, el)) return
    appearanceCount++
    emitAppearOrDisappear(manager, event, el)
  }

  function processAdded(root: Element) {
    if (isHiddenSubtree(root)) return
    const markers = findMarkers(root, true)
    for (const el of markers) {
      if (isHiddenSubtree(el)) continue
      if (shouldSuppressEmit("appear", el)) continue
      appearanceCount++
      emitAppearOrDisappear(manager, "appear", el)
    }
  }

  function processRemoved(root: Element) {
    // Can't check isHiddenSubtree on removed nodes reliably; skip the check
    const markers: Element[] = []
    try {
      if (root.matches?.(kMarkerSelector)) markers.push(root)
      const descendants = root.querySelectorAll?.(kMarkerSelector)
      if (descendants) for (const d of Array.from(descendants)) markers.push(d)
    } catch { /* ignore */ }
    for (const el of markers) {
      if (shouldSuppressEmit("disappear", el)) continue
      appearanceCount++
      emitAppearOrDisappear(manager, "disappear", el)
    }
  }

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-expanded", "aria-hidden", "aria-disabled", "disabled", "style"]
  })

  return {
    uninstall() {
      observer.disconnect()
    },
    getAppearanceCount() { return appearanceCount },
    resetDiagnostics() { appearanceCount = 0 }
  }
}
