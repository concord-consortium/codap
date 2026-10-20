import { classifyNode } from "./classify-node"
import { UiNotificationMonitorManager } from "./ui-notification-monitor-manager"
import { UiDialogChange, UiDialogChangeNotice, UiDialogChangeTarget, UiTarget } from "./ui-notification-types"

const kWatchedAttributes = [
  "disabled",
  "aria-disabled",
  "aria-expanded",
  "aria-selected",
  "aria-checked",
  "aria-pressed",
  "value",
  "data-testid"
]

const kControlSelector = "[data-testid]"

interface ScopedEntry {
  observer: MutationObserver
  dialogTarget: UiDialogChangeTarget
}

let scopedObservers: Map<Element, ScopedEntry> = new Map()
let managerRef: UiNotificationMonitorManager | undefined

export function installDialogChangeObserver(manager: UiNotificationMonitorManager) {
  managerRef = manager
  return {
    uninstall() {
      for (const { observer } of scopedObservers.values()) observer.disconnect()
      scopedObservers.clear()
      managerRef = undefined
    }
  }
}

function dialogTargetFrom(target: UiTarget | undefined): UiDialogChangeTarget {
  if (!target) return {}
  return {
    ...(target.testId ? { testId: target.testId } : {}),
    ...(target.label ? { title: target.label } : {})
  }
}

export function onDialogAppear(el: Element, appearTarget: UiTarget | undefined) {
  if (!managerRef) return
  if (scopedObservers.has(el)) return
  const dialogTarget = dialogTargetFrom(appearTarget)
  const cls = classifyNode(el)
  const region = cls.region

  const observer = new MutationObserver(records => {
    for (const r of records) {
      try {
        if (r.type === "attributes") {
          const attr = r.attributeName
          if (!attr || !kWatchedAttributes.includes(attr)) continue
          const el2 = r.target as Element
          const controlTestId = el2.getAttribute?.("data-testid") || undefined
          if (!controlTestId && attr !== "data-testid") continue
          const tag = (el2 as HTMLElement).tagName
          const before = r.oldValue ?? null
          const after = el2.getAttribute?.(attr) ?? null
          // Emit value transitions via attribute
          let change: UiDialogChange
          if (attr === "value") {
            change = { kind: "value", before: before ?? "", after: after ?? "" }
          } else {
            change = { kind: "attribute", name: attr, before, after }
          }
          const effectiveControlTestId = attr === "data-testid" ? after ?? undefined : controlTestId
          const notice: UiDialogChangeNotice = {
            eventType: "dialogChange",
            region,
            dialogTarget,
            control: {
              ...(effectiveControlTestId ? { testId: effectiveControlTestId } : {}),
              ...(tag ? { tag } : {})
            },
            change,
            monitor: { id: -1 }
          }
          managerRef?.deliver(notice)
        } else if (r.type === "characterData") {
          const text = (r.target as Text).data ?? ""
          const parent = r.target.parentElement
          if (!parent) continue
          const controlEl = parent.closest?.(kControlSelector)
          if (!controlEl) continue
          const controlTestId = controlEl.getAttribute("data-testid") || undefined
          const tag = controlEl.tagName
          const notice: UiDialogChangeNotice = {
            eventType: "dialogChange",
            region,
            dialogTarget,
            control: {
              ...(controlTestId ? { testId: controlTestId } : {}),
              ...(tag ? { tag } : {})
            },
            change: { kind: "label", before: "", after: text },
            monitor: { id: -1 }
          }
          managerRef?.deliver(notice)
        } else if (r.type === "childList") {
          // Handled via attribute observer; plus we also want to catch input value commits
          continue
        }
      } catch (e) {
        console.error("[ui-notifications] dialog-change observer error", e)
      }
    }
  })

  try {
    observer.observe(el, {
      attributes: true,
      attributeFilter: kWatchedAttributes,
      attributeOldValue: true,
      characterData: true,
      characterDataOldValue: true,
      subtree: true
    })
  } catch { /* jsdom compat */ }

  scopedObservers.set(el, { observer, dialogTarget })
}

export function onDialogDisappear(el: Element) {
  const entry = scopedObservers.get(el)
  if (!entry) return
  entry.observer.disconnect()
  scopedObservers.delete(el)
}

/** Test helper */
export function _getScopedObserverCount(): number {
  return scopedObservers.size
}

/** Reset for tests */
export function _resetDialogChangeObserver() {
  for (const { observer } of scopedObservers.values()) observer.disconnect()
  scopedObservers = new Map()
  managerRef = undefined
}
