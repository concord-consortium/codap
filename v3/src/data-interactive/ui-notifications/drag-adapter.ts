import type { DragCancelEvent, DragEndEvent, DragStartEvent } from "@dnd-kit/core"
import { buildTarget, classifyNode } from "./classify-node"
import { getRecentClick } from "./click-listener"
import { UiDragNotice, UiTarget } from "./ui-notification-types"

function targetFromDndEntity(entity: { data?: { current?: unknown }; id: string | number } | null): UiTarget {
  if (!entity) return {}
  const node = findNodeForEntity(entity)
  if (node) return buildTarget(node)
  return { testId: String(entity.id) }
}

function findNodeForEntity(entity: { id: string | number }): Element | null {
  // Look up by data-dnd-id (our convention) or by id lookup
  const id = String(entity.id)
  const byId = document.getElementById?.(id)
  if (byId) return byId
  const byAttr = document.querySelector?.(`[data-dnd-id="${CSS.escape(id)}"]`)
  return (byAttr) ?? null
}

export function buildDragStartNotice(event: DragStartEvent): UiDragNotice {
  const source = event.active
  const srcTarget = targetFromDndEntity(source as unknown as { id: string | number })
  const sourceId = String(source.id)
  const hint = source.rect?.current?.initial
    ? { clientX: (source.rect.current.initial as DOMRect).left, clientY: (source.rect.current.initial as DOMRect).top }
    : null
  void hint
  const cls = classifyElement(findNodeForEntity(source as unknown as { id: string | number }))
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
  const srcTarget = targetFromDndEntity(source as unknown as { id: string | number })
  const cls = classifyElement(findNodeForEntity(source as unknown as { id: string | number }))
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
  return buildDragEndNotice(event as DragEndEvent, true)
}

function classifyElement(el: Element | null) {
  if (!el) return { region: "overlay" as const }
  return classifyNode(el, { recentClick: getRecentClick() })
}
