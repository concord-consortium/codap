import { ITileModel } from "./tile-model"
import {
  componentShowHideNotification, createTileNotification, deleteTileNotification, updateTileNotification
} from "./tile-notifications"

jest.mock("./tile-content-info", () => ({
  getTileContentInfo: jest.fn((type: string) => {
    // The calculator is V3's only singleton today; Graph and other types are non-singleton.
    // WebView exposes a content-dependent `getV2Type` (returns 'game' when content.isPlugin)
    // so the helper can route plugin webviews to the DG.GameView SC name automatically.
    if (type === "Calculator") return { isSingleton: true }
    if (type === "CodapWebView") {
      return {
        isSingleton: false,
        getV2Type: (content: any) => content?.isPlugin ? "game" : "webView"
      }
    }
    return { isSingleton: false }
  })
}))

const v3TileType = "Graph"
// V2 uses two `type` conventions depending on the operation: lifecycle ops
// (create/delete/hide/show) carry the lowercase DI-convention name (`graph`);
// operational ops (titleChange, attributeChange, etc.) carry the SC class name
// (`DG.GraphView`). V3 mirrors this per-op and always emits the DI name as the
// additive `diType` field.
const v2SCType = "DG.GraphView"
const diType = "graph"
const v3Id = "TILE12345"
const v2Id = 12345
const tileTitle = "Test Graph"

describe("createTileNotification", () => {
  it("should create a notification with the correct operation and result", () => {
    const tileMock = { id: v3Id, content: { type: v3TileType } } as ITileModel

    const notification = createTileNotification(tileMock)

    expect(notification).toBeDefined()
    expect(notification?.message.action).toBe("notify")
    expect(notification?.message.resource).toBe("component")
    expect(notification?.message.values.operation).toBe("create")
    expect(notification?.message.values.id).toBe(v2Id)
    // `create` is a lifecycle op — V2 emits the lowercase name here.
    expect(notification?.message.values.type).toBe(diType)
    expect(notification?.message.values.diType).toBe(diType)
  })

  it("should return undefined if no tile is provided", () => {
    const notification = createTileNotification()

    expect(notification).toBeUndefined()
  })
})

describe("deleteTileNotification", () => {
  it("should create a notification with the correct operation and result", () => {
    const tileMock = {
      id: v3Id,
      content: { type: v3TileType },
      name: tileTitle,
      title: tileTitle
    } as ITileModel

    const notification = deleteTileNotification(tileMock)

    expect(notification).toBeDefined()
    expect(notification?.message.action).toBe("notify")
    expect(notification?.message.resource).toBe("component")
    expect(notification?.message.values.operation).toBe("delete")
    expect(notification?.message.values.id).toBe(v2Id)
    expect(notification?.message.values.name).toBe(tileTitle)
    expect(notification?.message.values.title).toBe(tileTitle)
    // `delete` is a lifecycle op — V2 emits the lowercase name here.
    expect(notification?.message.values.type).toBe(diType)
    expect(notification?.message.values.diType).toBe(diType)
  })
})

describe("updateTileNotification", () => {
  it("should create a notification with the correct operation and result", () => {
    const updateType = "attributeChange"
    const tileMock = { id: v3Id, content: { type: v3TileType } } as ITileModel
    const values = {
      attributeId: "ATTR123",
      attributeName: "Test Attribute",
      axisOrientation: "horizontal"
    }

    const notification = updateTileNotification(updateType, values, tileMock)

    expect(notification).toBeDefined()
    expect(notification?.message.action).toBe("notify")
    expect(notification?.message.resource).toBe("component")
    expect(notification?.message.values.operation).toBe(updateType)
    expect(notification?.message.values.id).toBe(v2Id)
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
  })
})

describe("titleChange notification envelope", () => {
  it("adds type (SC name) to the outer envelope for the titleChange operation", () => {
    const tileMock = { id: v3Id, content: { type: v3TileType } } as ITileModel
    const values = { from: "Old Title", to: "New Title" }

    const notification = updateTileNotification("titleChange", values, tileMock)

    expect(notification?.message.action).toBe("notify")
    expect(notification?.message.resource).toBe(`component[${v2Id}]`)
    // Outer envelope mirrors V2's `model.type` (the SC name).
    expect((notification?.message as any).type).toBe(v2SCType)
    expect(notification?.message.values.operation).toBe("titleChange")
    expect(notification?.message.values.id).toBe(v2Id)
    expect(notification?.message.values.from).toBe("Old Title")
    expect(notification?.message.values.to).toBe("New Title")
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
  })

  it("keeps type inside values for non-titleChange operations", () => {
    const tileMock = { id: v3Id, content: { type: v3TileType } } as ITileModel

    const notification = updateTileNotification("attributeChange", {}, tileMock)

    expect((notification?.message as any).type).toBeUndefined()
    expect(notification?.message.values.type).toBe(v2SCType)
    expect(notification?.message.values.diType).toBe(diType)
  })
})

describe("componentShowHideNotification (singleton lifecycle)", () => {
  it("emits `show` with V2's lifecycle name as `type` (calcView, not calculator)", () => {
    // V2 emits `type: 'calcView'` for calculator hide/show (document_controller.js:587).
    // V3 mirrors this via kV2DITypeToLifecycleNameMap. `diType` stays the DI name.
    const calcTile = { id: "CALC1", content: { type: "Calculator" } } as ITileModel
    const notification = componentShowHideNotification(calcTile, "show")
    expect(notification?.message.action).toBe("notify")
    expect(notification?.message.resource).toBe("component")
    expect(notification?.message.values.operation).toBe("show")
    expect(notification?.message.values.type).toBe("calcView")
    expect(notification?.message.values.diType).toBe("calculator")
  })

  it("emits `hide` for a singleton tile with the calcView lifecycle name", () => {
    const calcTile = { id: "CALC1", content: { type: "Calculator" } } as ITileModel
    const notification = componentShowHideNotification(calcTile, "hide")
    expect(notification?.message.values.operation).toBe("hide")
    expect(notification?.message.values.type).toBe("calcView")
    expect(notification?.message.values.diType).toBe("calculator")
  })

  it("returns undefined for non-singleton tiles (e.g. Graph)", () => {
    const graphTile = { id: v3Id, content: { type: v3TileType } } as ITileModel
    expect(componentShowHideNotification(graphTile, "hide")).toBeUndefined()
  })

  it("returns undefined when no tile is provided", () => {
    expect(componentShowHideNotification(undefined, "show")).toBeUndefined()
  })
})

describe("V2 lifecycle-name overrides via kV2DITypeToLifecycleNameMap", () => {
  it("emits `type: 'table'` (not 'caseTable') on case-table create", () => {
    // V2: app_controller.js:122 emits makeComponentNotification('create', 'table').
    const tableTile = {
      id: "TABLE1", content: { type: "CaseTable" }, name: "Mammals", title: "Mammals"
    } as ITileModel
    const notification = createTileNotification(tableTile)
    expect(notification?.message.values.operation).toBe("create")
    expect(notification?.message.values.type).toBe("table")
    expect(notification?.message.values.diType).toBe("caseTable")
  })

  it("emits `type: 'table'` on case-table delete (same override)", () => {
    const tableTile = {
      id: "TABLE1", content: { type: "CaseTable" }, name: "Mammals", title: "Mammals"
    } as ITileModel
    const notification = deleteTileNotification(tableTile)
    expect(notification?.message.values.operation).toBe("delete")
    expect(notification?.message.values.type).toBe("table")
    expect(notification?.message.values.diType).toBe("caseTable")
  })

  it("uses the DI name verbatim for tile types with no override (e.g. graph)", () => {
    const graphTile = { id: v3Id, content: { type: v3TileType } } as ITileModel
    const notification = createTileNotification(graphTile)
    // No override → lifecycle type === DI type.
    expect(notification?.message.values.type).toBe("graph")
    expect(notification?.message.values.diType).toBe("graph")
  })
})

describe("getV2Type integration (content-dependent DI type)", () => {
  it("resolves the DI type via getV2Type — WebView with isPlugin yields `game`", () => {
    // V3 collapses Game / Guide / Image / WebView into a single tile type; the V2 DI type
    // depends on content. WebView's getV2Type returns 'game' when content.isPlugin, mirrored
    // by the API responses in component-handler / component-list-handler / data-display-handler.
    const pluginTile = {
      id: "PLUGIN1", content: { type: "CodapWebView", isPlugin: true }
    } as any
    const notification = updateTileNotification("attributeChange", {}, pluginTile)
    // diType follows getV2Type's result; SC name follows the DI type via kV2DITypeToSCNameMap.
    expect(notification?.message.values.diType).toBe("game")
    expect(notification?.message.values.type).toBe("DG.GameView")
  })

  it("falls back to the static map when getV2Type returns the non-plugin name", () => {
    const webTile = {
      id: "WEB1", content: { type: "CodapWebView", isPlugin: false }
    } as any
    const notification = updateTileNotification("attributeChange", {}, webTile)
    expect(notification?.message.values.diType).toBe("webView")
    expect(notification?.message.values.type).toBe("DG.WebView")
  })
})
