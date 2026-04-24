import { FreeTileRow } from "../../models/document/free-tile-row"
import { persistentState } from "../../models/persistent-state"
import { installLayoutChangeReactions } from "./layout-change-reactions"
import { UiNotificationMonitorManager } from "./ui-notification-monitor-manager"
import { UiLayoutChangeNotice, UiNotice } from "./ui-notification-types"

function makeManagerWithCapture() {
  const manager = new UiNotificationMonitorManager({ debounceMs: 0 })
  const delivered: UiNotice[] = []
  manager.setDocumentProvider(() => ({
    content: {
      broadcastMessage: (payload: Record<string, unknown>) => {
        delivered.push((payload as { values: UiNotice }).values)
      }
    }
  }))
  return { manager, delivered }
}

function findLayoutChange(delivered: UiNotice[], setting: string): UiLayoutChangeNotice | undefined {
  return delivered.find((d): d is UiLayoutChangeNotice =>
    d.eventType === "layoutChange" && (d as { setting?: string }).setting === setting
  )
}

describe("layout-change-reactions", () => {
  it("fires layoutChange for persistentState.toolbarPosition", () => {
    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["layoutChange"] })
    const installed = installLayoutChangeReactions(manager, { getDocument: () => undefined })

    const prev = persistentState.toolbarPosition
    const next: "Top" | "Left" = prev === "Top" ? "Left" : "Top"
    persistentState.setToolbarPosition(next)

    const lc = findLayoutChange(delivered, "toolbarPosition")
    expect(lc).toBeTruthy()
    expect(lc?.value).toBe(next)
    expect(lc?.previousValue).toBe(prev)
    expect(lc?.region).toBe("header")

    installed.uninstall()
    persistentState.setToolbarPosition(prev as "Top" | "Left")
  })

  it("fires layoutChange for per-tile isMinimized", () => {
    const row = FreeTileRow.create({ tiles: { "TILE-A": { tileId: "TILE-A", x: 0, y: 0 } } })
    const getDocument = () => ({ content: { rowMap: new Map([["r1", row]]) } })

    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["layoutChange"] })
    const installed = installLayoutChangeReactions(manager, { getDocument: getDocument as never })

    row.setTileMinimized("TILE-A", true)
    const mini = findLayoutChange(delivered, "tileMinimized")
    expect(mini).toBeTruthy()
    expect(mini?.value).toBe(true)
    expect(mini?.previousValue).toBe(false)
    expect(mini?.region).toBe("workspace")

    installed.uninstall()
  })

  it("fires layoutChange for tileSize", () => {
    const row = FreeTileRow.create({
      tiles: { "TILE-B": { tileId: "TILE-B", x: 0, y: 0, width: 100, height: 100 } }
    })
    const getDocument = () => ({ content: { rowMap: new Map([["r1", row]]) } })

    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["layoutChange"] })
    const installed = installLayoutChangeReactions(manager, { getDocument: getDocument as never })

    row.setTileDimensions("TILE-B", { width: 200, height: 150 })
    const size = findLayoutChange(delivered, "tileSize")
    expect(size).toBeTruthy()
    expect(size?.value).toEqual({ width: 200, height: 150 })
    installed.uninstall()
  })

  it("fires layoutChange for tilePosition", () => {
    const row = FreeTileRow.create({
      tiles: { "TILE-C": { tileId: "TILE-C", x: 10, y: 10 } }
    })
    const getDocument = () => ({ content: { rowMap: new Map([["r1", row]]) } })

    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["layoutChange"] })
    const installed = installLayoutChangeReactions(manager, { getDocument: getDocument as never })

    row.setTilePosition("TILE-C", { x: 50, y: 75 })
    const pos = findLayoutChange(delivered, "tilePosition")
    expect(pos).toBeTruthy()
    expect(pos?.value).toEqual({ x: 50, y: 75 })
    installed.uninstall()
  })

  it("fires layoutChange tileAdded when a new tile enters the doc", () => {
    const row = FreeTileRow.create({ tiles: {} })
    const tileMap = new Map<string, { content: { type: string } }>([
      ["TILE-D", { content: { type: "map" } }]
    ])
    const getDocument = () => ({
      content: { rowMap: new Map([["r1", row]]), tileMap }
    })

    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["layoutChange"] })
    const installed = installLayoutChangeReactions(manager, { getDocument: getDocument as never })

    row.insertTile("TILE-D", { x: 0, y: 0 })
    const added = findLayoutChange(delivered, "tileAdded")
    expect(added).toBeTruthy()
    expect(added?.value).toEqual({ componentId: "TILE-D", type: "map" })
    expect(added?.previousValue).toBeNull()
    expect(added?.region).toBe("workspace")
    expect(added?.target?.componentId).toBe("TILE-D")
    installed.uninstall()
  })

  it("fires layoutChange tileRemoved when a tile leaves the doc", () => {
    const row = FreeTileRow.create({
      tiles: { "TILE-E": { tileId: "TILE-E", x: 0, y: 0 } }
    })
    const tileMap = new Map<string, { content: { type: string } }>([
      ["TILE-E", { content: { type: "graph" } }]
    ])
    const getDocument = () => ({
      content: { rowMap: new Map([["r1", row]]), tileMap }
    })

    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["layoutChange"] })
    const installed = installLayoutChangeReactions(manager, { getDocument: getDocument as never })

    row.removeTile("TILE-E")
    const removed = findLayoutChange(delivered, "tileRemoved")
    expect(removed).toBeTruthy()
    expect(removed?.previousValue).toEqual({ componentId: "TILE-E", type: "graph" })
    expect(removed?.value).toBeNull()
    expect(removed?.region).toBe("workspace")
    expect(removed?.target?.componentId).toBe("TILE-E")
    installed.uninstall()
  })

  it("does NOT emit tileAdded on install for pre-existing tiles", () => {
    const row = FreeTileRow.create({
      tiles: { "TILE-PRE": { tileId: "TILE-PRE", x: 0, y: 0 } }
    })
    const getDocument = () => ({
      content: { rowMap: new Map([["r1", row]]), tileMap: new Map() }
    })

    const { manager, delivered } = makeManagerWithCapture()
    manager.register("plugin-A", { eventTypes: ["layoutChange"] })
    const installed = installLayoutChangeReactions(manager, { getDocument: getDocument as never })

    expect(findLayoutChange(delivered, "tileAdded")).toBeUndefined()
    installed.uninstall()
  })
})
