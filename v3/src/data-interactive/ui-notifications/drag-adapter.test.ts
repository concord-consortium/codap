import type { DragCancelEvent, DragEndEvent, DragStartEvent } from "@dnd-kit/core"
import { buildDragCancelNotice, buildDragEndNotice, buildDragStartNotice } from "./drag-adapter"

function start(id: string): DragStartEvent {
  return { active: { id, data: { current: undefined }, rect: { current: { initial: null, translated: null } } } } as any
}
function end(id: string, overId?: string): DragEndEvent {
  return {
    active: { id, data: { current: undefined }, rect: { current: { initial: null, translated: null } } },
    over: overId != null ? { id: overId, rect: {} as any, data: { current: undefined } } : null,
    delta: { x: 0, y: 0 },
    collisions: null,
    activatorEvent: null as any
  } as any
}

describe("drag-adapter", () => {
  beforeEach(() => { document.body.innerHTML = "" })

  it("buildDragStartNotice produces dragStart with dragId.source", () => {
    const n = buildDragStartNotice(start("case-table-1-ATTR8"))
    expect(n.eventType).toBe("dragStart")
    expect(n.dragId.source).toBe("case-table-1-ATTR8")
    expect(n.dragId.over).toBeUndefined()
  })

  it("buildDragEndNotice with over carries over in dragId", () => {
    const n = buildDragEndNotice(end("case-table-1-ATTR8", "graph-1-bottom-axis-drop"))
    expect(n.eventType).toBe("dragEnd")
    expect(n.dragId.source).toBe("case-table-1-ATTR8")
    expect(n.dragId.over).toBe("graph-1-bottom-axis-drop")
    expect(n.cancelled).toBeUndefined()
  })

  it("buildDragEndNotice with null over produces cancelled: true", () => {
    const n = buildDragEndNotice(end("src"))
    expect(n.cancelled).toBe(true)
  })

  it("buildDragCancelNotice produces dragEnd with cancelled: true", () => {
    const e = { active: { id: "src", data: { current: undefined }, rect: {} as any } } as unknown as DragCancelEvent
    const n = buildDragCancelNotice(e)
    expect(n.eventType).toBe("dragEnd")
    expect(n.cancelled).toBe(true)
  })
})
