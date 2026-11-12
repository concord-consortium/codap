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

export function getRecentClick(): RecentClickState | undefined {
  return recentClick
}

function updateRecentClick(region: UiRegion, componentId?: string) {
  recentClick = { timestampMs: Date.now(), region, componentId }
}

const kWidgetRoles = [
  "button", "link", "menuitem", "menuitemcheckbox", "menuitemradio", "tab", "checkbox", "radio",
  "switch", "option", "slider", "spinbutton", "combobox", "treeitem"
]
const kControlSelector = [
  "button", "a[href]", "input", "select", "textarea", "summary", "[data-role]",
  ...kWidgetRoles.map(role => `[role="${role}"]`)
].join(",")

/** A click on a control's icon or text is reported as a click on the control. */
function buildClickTarget(el: Element): UiTarget {
  const control = el.closest?.(kControlSelector) ?? el
  const target = buildTarget(control)
  const label = resolveLabel(control)
  if (label != null) target.label = label
  const interactionKind = resolveInteractionKind(control)
  if (interactionKind != null) target.interactionKind = interactionKind
  if (resolveDisabled(control) === true) target.disabled = true
  return target
}

export interface ClickListenerInstalled {
  uninstall(): void
}

export function installClickListener(manager: UiNotificationMonitorManager): ClickListenerInstalled {
  // Only real click events are reported, so the browser and the component libraries decide what
  // counts as activation. A click synthesized from Enter/Space (by the browser, or by a library
  // calling element.click()) has detail 0. React Aria's usePress dispatches no click for keyboard
  // activation, so those activations are not reported.
  const onClick = (e: Event) => {
    try {
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
        via: (e as MouseEvent).detail === 0 ? "keyboard" : "pointer",
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

  document.addEventListener("click", onClick, true)
  document.addEventListener("dblclick", onDblClick, true)

  return {
    uninstall() {
      document.removeEventListener("click", onClick, true)
      document.removeEventListener("dblclick", onDblClick, true)
      recentClick = undefined
    }
  }
}

/** Test helper to reset internal state between tests */
export function _resetClickListenerState() {
  recentClick = undefined
}
