import { ClientRect, DroppableContainer } from "@dnd-kit/core"
import { dndDetectCollision, registerTileCollisionDetection } from "../../lib/dnd-kit/dnd-detect-collision"
import "./slider-component"

function rect(left: number, top: number, width: number, height: number): ClientRect {
  return { left, top, width, height, right: left + width, bottom: top + height }
}

function container(id: string, node: HTMLElement): DroppableContainer {
  return {
    id, key: id, data: { current: undefined }, disabled: false, node: { current: node }, rect: { current: null }
  }
}

describe("slider drop collision detection", () => {
  it("routes a drop to a slider painted over a raised tile's droppable rects", () => {
    // the case table registers its own handler; stand in for it so its droppables are reachable
    registerTileCollisionDetection("case-table")

    // The source table is raised above the slider at drag start, but its droppables' rects extend
    // past its painted area to the point where the slider is painted.
    document.body.innerHTML = `
      <div data-tile-z-index="10">
        <div id="table-overlay"></div><div id="table-drop"></div>
      </div>
      <div data-tile-z-index="5">
        <div id="slider-wrapper"><span id="painted"></span><div id="slider-highlight"></div></div>
      </div>`
    const byId = (id: string) => document.getElementById(id)!
    document.elementFromPoint = jest.fn(() => byId("painted"))

    const tableRect = rect(0, 0, 200, 200)
    const sliderRect = rect(100, 100, 200, 100)
    const containers = [
      container("case-table-1-drop-overlay", byId("table-overlay")),
      container("case-table-1-column-drop", byId("table-drop")),
      container("slider-1-component-drop-overlay", byId("slider-wrapper")),
      container("slider-1-slider-attribute-drop", byId("slider-highlight"))
    ]
    const droppableRects = new Map<string, ClientRect>([
      ["case-table-1-drop-overlay", tableRect],
      ["case-table-1-column-drop", tableRect],
      ["slider-1-component-drop-overlay", sliderRect],
      ["slider-1-slider-attribute-drop", sliderRect]
    ])

    const collisions = dndDetectCollision({
      active: { id: "drag", data: { current: undefined }, rect: { current: { initial: null, translated: null } } },
      collisionRect: rect(145, 145, 10, 10),
      droppableRects,
      droppableContainers: containers,
      pointerCoordinates: { x: 150, y: 150 }
    })
    expect(collisions.map(c => c.id)).toEqual(["slider-1-slider-attribute-drop"])
  })
})
