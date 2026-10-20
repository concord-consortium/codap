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

  // dnd-kit ids (e.g. "case-table-1-ATTR8") are not DOM ids, so the dragged element comes from the
  // event that started the drag.
  it("describes the element that started the drag, not the dnd-kit id", () => {
    document.body.innerHTML = `
      <div class="free-tile-component" id="TABL1">
        <button data-testid="codap-attribute-button-0"><span class="label">Height</span></button>
      </div>`
    const grabbed = document.querySelector(".label")!
    const activatorEvent = { target: grabbed } as unknown as Event

    const s = buildDragStartNotice({ ...start("case-table-1-ATTR8"), activatorEvent })
    expect(s.target.testId).toBe("codap-attribute-button-0")
    expect(s.target.componentId).toBe("TABL1")
    expect(s.region).toBe("workspace")
    expect(s.dragId.source).toBe("case-table-1-ATTR8")

    const e = buildDragEndNotice({ ...end("case-table-1-ATTR8", "drop"), activatorEvent })
    expect(e.target.testId).toBe("codap-attribute-button-0")
    expect(e.region).toBe("workspace")
  })
})
