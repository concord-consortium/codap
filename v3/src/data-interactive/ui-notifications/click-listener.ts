import {
  buildTarget, classifyNode, resolveDisabled, resolveInteractionKind, tileIdOf
} from "./classify-node"
import { resolveLabel } from "./label-resolution"
import { UiNotificationMonitorManager } from "./ui-notification-monitor-manager"
import { UiClickNotice, UiRegion, UiTarget } from "./ui-notification-types"

interface RecentClickState {
  timestampMs: number
  region: UiRegion
  componentId?: string
}

let recentClick: RecentClickState | undefined
// Per-install generation counter for keyboard→click dedup.
// Each install() increments the generation; entries stamped with a stale
// generation are ignored so a pending suppression from a previous install
// can never leak into a later re-subscribe.
let suppressGeneration = 0
const suppressMap = new WeakMap<Element, number>()

export function getRecentClick(): RecentClickState | undefined {
  return recentClick
}

function updateRecentClick(region: UiRegion, componentId?: string) {
  recentClick = { timestampMs: Date.now(), region, componentId }
}

function buildClickTarget(el: Element): UiTarget {
  const target = buildTarget(el)
  const label = resolveLabel(el)
  if (label != null) target.label = label
  const interactionKind = resolveInteractionKind(el)
  if (interactionKind != null && target.interactionKind == null) target.interactionKind = interactionKind
  const disabled = resolveDisabled(el)
  if (disabled === true) target.disabled = true
  return target
}

export interface ClickListenerInstalled {
  uninstall(): void
}

export function installClickListener(manager: UiNotificationMonitorManager): ClickListenerInstalled {
  const generation = ++suppressGeneration
  const onClick = (e: Event) => {
    try {
      const t = e.target as Element | null
      if (!t) return
      if (suppressMap.get(t) === generation) {
        suppressMap.delete(t)
        return
      }
      const cls = classifyNode(t, { recentClick: getRecentClick() })
      updateRecentClick(cls.region, cls.componentId ?? tileIdOf(t))
      const target = buildClickTarget(t)
      if (cls.componentId && !target.componentId) target.componentId = cls.componentId
      const notice: UiClickNotice = {
        eventType: "click",
        region: cls.region,
        target,
        via: "pointer",
        monitor: { id: -1 }
      }
      manager.deliver(notice)
    } catch (err) {
      console.error("[ui-notifications] click handler error", err)
    }
  }

  const onDblClick = (e: Event) => {
    try {
      const t = e.target as Element | null
      if (!t) return
      const cls = classifyNode(t, { recentClick: getRecentClick() })
      const target = buildClickTarget(t)
      if (cls.componentId && !target.componentId) target.componentId = cls.componentId
      const notice: UiClickNotice = {
        eventType: "dblclick",
        region: cls.region,
        target,
        via: "pointer",
        monitor: { id: -1 }
      }
      manager.deliver(notice)
    } catch (err) {
      console.error("[ui-notifications] dblclick handler error", err)
    }
  }

  const onKeyDown = (e: Event) => {
    try {
      const ke = e as KeyboardEvent
      if (ke.key !== "Enter" && ke.key !== " ") return
      const t = e.target as Element | null
      if (!t) return
      const cls = classifyNode(t, { recentClick: getRecentClick() })
      updateRecentClick(cls.region, cls.componentId ?? tileIdOf(t))
      const target = buildClickTarget(t)
      if (cls.componentId && !target.componentId) target.componentId = cls.componentId
      const notice: UiClickNotice = {
        eventType: "click",
        region: cls.region,
        target,
        via: "keyboard",
        key: ke.key,
        monitor: { id: -1 }
      }
      manager.deliver(notice)
      // Mark element so the synthesized click doesn't re-emit
      suppressMap.set(t, generation)
    } catch (err) {
      console.error("[ui-notifications] keydown handler error", err)
    }
  }

  document.addEventListener("click", onClick, true)
  document.addEventListener("dblclick", onDblClick, true)
  document.addEventListener("keydown", onKeyDown, true)

  return {
    uninstall() {
      document.removeEventListener("click", onClick, true)
      document.removeEventListener("dblclick", onDblClick, true)
      document.removeEventListener("keydown", onKeyDown, true)
      // Bump the generation so any still-pending entries in suppressMap are
      // considered stale — a re-subscribe starts with a clean slate.
      suppressGeneration++
      recentClick = undefined
    }
  }
}

/** Test helper to reset internal state between tests */
export function _resetClickListenerState() {
  recentClick = undefined
  suppressGeneration++
}
