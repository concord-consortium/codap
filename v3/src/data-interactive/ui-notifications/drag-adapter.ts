import type { DragCancelEvent, DragEndEvent, DragStartEvent } from "@dnd-kit/core"
import { buildTarget, classifyNode } from "./classify-node"
import { getRecentClick } from "./click-listener"
import { UiDragNotice, UiTarget } from "./ui-notification-types"

// dnd-kit ids (e.g. "case-table-1-ATTR8") are not DOM ids, so the dragged element is the target of
// the pointer or keyboard event that started the drag.
function findDraggedNode(event: { activatorEvent?: Event | null }): Element | null {
  const target = event.activatorEvent?.target
  return target instanceof Element ? target : null
}

function targetFromDraggedNode(node: Element | null, sourceId: string): UiTarget {
  return node ? buildTarget(node) : { testId: sourceId }
}

export function buildDragStartNotice(event: DragStartEvent): UiDragNotice {
  const source = event.active
  const sourceId = String(source.id)
  const node = findDraggedNode(event)
  const srcTarget = targetFromDraggedNode(node, sourceId)
  const cls = classifyElement(node)
  return {
    eventType: "dragStart",
    region: cls.region,
    target: {
      ...srcTarget,
      ...(cls.componentId && !srcTarget.componentId ? { componentId: cls.componentId } : {})
    },
    dragId: { source: sourceId },
    monitor: { id: -1 }
  }
}

export function buildDragEndNotice(
  event: DragEndEvent,
  cancelled = false
): UiDragNotice {
  const source = event.active
  const over = event.over
  const sourceId = String(source.id)
  const overId = over?.id != null ? String(over.id) : undefined
  const node = findDraggedNode(event)
  const srcTarget = targetFromDraggedNode(node, sourceId)
  const cls = classifyElement(node)
  const isCancelled = cancelled || !over
  return {
    eventType: "dragEnd",
    region: cls.region,
    target: {
      ...srcTarget,
      ...(cls.componentId && !srcTarget.componentId ? { componentId: cls.componentId } : {})
    },
    dragId: { source: sourceId, ...(overId != null ? { over: overId } : {}) },
    ...(isCancelled ? { cancelled: true as const } : {}),
    monitor: { id: -1 }
  }
}

export function buildDragCancelNotice(event: DragCancelEvent): UiDragNotice {
  return buildDragEndNotice(event, true)
}

function classifyElement(el: Element | null) {
  if (!el) return { region: "overlay" as const }
  return classifyNode(el, { recentClick: getRecentClick() })
}
