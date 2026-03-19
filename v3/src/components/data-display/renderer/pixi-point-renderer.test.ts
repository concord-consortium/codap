import { CaseDataWithSubPlot } from "../d3-types"
import { NullPointRenderer } from "./null-point-renderer"
import { PixiPointRenderer } from "./pixi-point-renderer"
import { IPointStyle } from "./point-renderer-types"
import { PointsState } from "./points-state"

// Mock pixi.js to avoid WebGL requirements in jsdom
jest.mock("pixi.js", () => {
  class MockContainer {
    children: any[] = []
    sortableChildren = false
    visible = true
    addChild(child: any) { child.parent = this; this.children.push(child) }
    removeChild(child: any) {
      const idx = this.children.indexOf(child)
      if (idx >= 0) this.children.splice(idx, 1)
    }
    destroy() { this.children = [] }
  }
  class MockSprite {
    anchor = { x: 0, y: 0, copyFrom(p: any) { this.x = p.x; this.y = p.y } }
    position = { x: 0, y: 0, set(x: number, y: number) { this.x = x; this.y = y } }
    scale = { x: 1, y: 1, set(x: number, y: number) { this.x = x; this.y = y } }
    zIndex = 0
    eventMode = "none"
    cursor = "default"
    texture: any = null
    mask: any = null
    width = 12
    height = 12
    parent: any = null
    on(_event: string, _handler: any) { return this }
    destroy() {
      if (this.parent) {
        const idx = this.parent.children.indexOf(this)
        if (idx >= 0) this.parent.children.splice(idx, 1)
      }
    }
  }
  class MockGraphics {
    boundsArea: any = null
    rect() { return this }
    circle() { return this }
    fill() { return this }
    stroke() { return this }
    destroy() {}
  }
  class MockTicker {
    started = false
    add() {}
    start() { this.started = true }
    stop() { this.started = false }
    destroy() {}
  }
  class MockTexture {
    destroy() {}
  }
  class MockRenderer {
    view = { canvas: document.createElement("canvas") }
    resize() {}
    render() {}
    generateTexture() { return new MockTexture() }
    destroy() {}
  }
  return {
    Container: MockContainer,
    Sprite: Object.assign(MockSprite, { constructor: MockSprite }),
    Graphics: MockGraphics,
    Ticker: MockTicker,
    Texture: { EMPTY: new MockTexture(), WHITE: new MockTexture() },
    Rectangle: class { constructor(public x = 0, public y = 0, public width = 0, public height = 0) {} },
    autoDetectRenderer: jest.fn().mockResolvedValue(new MockRenderer()),
  }
})

describe("PixiPointRenderer", () => {
  const defaultStyle: IPointStyle = {
    radius: 6,
    fill: "#ff0000",
    stroke: "#000000",
    strokeWidth: 1
  }

  const createCaseData = (plotNum: number, caseID: string, subPlotNum?: number): CaseDataWithSubPlot => ({
    plotNum,
    caseID,
    subPlotNum
  })

  describe("orphan sprite cleanup", () => {
    it("removes sprites that have no corresponding state entry after shared state is modified externally", async () => {
      // This test reproduces the race condition where:
      // 1. NullPointRenderer and PixiPointRenderer share the same PointsState
      // 2. NullPointRenderer adds 3 cases to state
      // 3. PixiPointRenderer initializes and creates sprites from state (syncFromState)
      // 4. NullPointRenderer removes 2 cases from state (e.g., due to attribute filter)
      // 5. PixiPointRenderer.doMatchPointsToData should clean up the 2 orphan sprites

      const sharedState = new PointsState()
      const nullRenderer = new NullPointRenderer(sharedState)
      const pixiRenderer = new PixiPointRenderer(sharedState)

      const case1 = createCaseData(0, "case1")
      const case2 = createCaseData(0, "case2")
      const case3 = createCaseData(0, "case3")
      const allCases = [case1, case2, case3]
      const filteredCases = [case3]

      // Step 1: NullPointRenderer syncs 3 cases into shared state
      nullRenderer.matchPointsToData("ds1", allCases, "points", defaultStyle)
      expect(sharedState.size).toBe(3)

      // Step 2: PixiPointRenderer initializes (creates sprites from shared state)
      await pixiRenderer.init()
      expect(pixiRenderer.pointsCount).toBe(3)

      // Access private members for verification
      const sprites = (pixiRenderer as any).sprites as Map<string, any>
      const container = (pixiRenderer as any).pointsContainer as { children: any[] }
      expect(sprites.size).toBe(3)
      expect(container.children.length).toBe(3)

      // Step 3: NullPointRenderer removes 2 cases from shared state (simulating filter update)
      nullRenderer.matchPointsToData("ds1", filteredCases, "points", defaultStyle)
      expect(sharedState.size).toBe(1)

      // At this point, sprites map still has 3 entries but state only has 1
      expect(sprites.size).toBe(3)

      // Step 4: PixiPointRenderer syncs — should clean up orphan sprites
      pixiRenderer.matchPointsToData("ds1", filteredCases, "points", defaultStyle)

      // Verify orphan sprites were cleaned up
      expect(sharedState.size).toBe(1)
      expect(sprites.size).toBe(1)
      expect(container.children.length).toBe(1)
      expect(pixiRenderer.pointsCount).toBe(1)

      pixiRenderer.dispose()
    })

    it("handles equal-size mismatch when NullPointRenderer replaces cases with different cases", async () => {
      // Reproduces the case where state.size === sprites.size but IDs differ:
      // NullPointRenderer replaces N cases with N different cases in shared state.

      const sharedState = new PointsState()
      const nullRenderer = new NullPointRenderer(sharedState)
      const pixiRenderer = new PixiPointRenderer(sharedState)

      const oldCases = [createCaseData(0, "case1"), createCaseData(0, "case2")]
      const newCases = [createCaseData(0, "case4"), createCaseData(0, "case5")]

      // NullPointRenderer syncs 2 cases into shared state
      nullRenderer.matchPointsToData("ds1", oldCases, "points", defaultStyle)
      expect(sharedState.size).toBe(2)

      // PixiPointRenderer initializes — creates sprites for case1, case2
      await pixiRenderer.init()
      const sprites = (pixiRenderer as any).sprites as Map<string, any>
      const container = (pixiRenderer as any).pointsContainer as { children: any[] }
      expect(sprites.size).toBe(2)

      // NullPointRenderer replaces cases with different ones (same count)
      nullRenderer.matchPointsToData("ds1", newCases, "points", defaultStyle)
      expect(sharedState.size).toBe(2)

      // sprites still has old entries, state has new entries — sizes match but IDs differ
      expect(sprites.size).toBe(2)

      // PixiPointRenderer syncs — should remove orphan sprites AND create new ones
      pixiRenderer.matchPointsToData("ds1", newCases, "points", defaultStyle)

      expect(sharedState.size).toBe(2)
      expect(sprites.size).toBe(2)
      expect(container.children.length).toBe(2)

      // Verify the sprites are for the NEW cases, not the old ones
      const statePointIds = new Set<string>()
      sharedState.forEach(p => statePointIds.add(p.id))
      sprites.forEach((_sprite: any, pointId: string) => {
        expect(statePointIds.has(pointId)).toBe(true)
      })

      pixiRenderer.dispose()
    })

    it("does not remove sprites when state and sprites are in sync", async () => {
      const sharedState = new PointsState()
      const pixiRenderer = new PixiPointRenderer(sharedState)

      const cases = [
        createCaseData(0, "case1"),
        createCaseData(0, "case2"),
        createCaseData(0, "case3")
      ]

      await pixiRenderer.init()

      // Normal sync — no external state modification
      pixiRenderer.matchPointsToData("ds1", cases, "points", defaultStyle)

      const sprites = (pixiRenderer as any).sprites as Map<string, any>
      expect(sprites.size).toBe(3)
      expect(sharedState.size).toBe(3)

      // Sync with fewer cases — normal removal path (no orphans)
      pixiRenderer.matchPointsToData("ds1", [cases[2]], "points", defaultStyle)
      expect(sprites.size).toBe(1)
      expect(sharedState.size).toBe(1)

      pixiRenderer.dispose()
    })
  })
})
