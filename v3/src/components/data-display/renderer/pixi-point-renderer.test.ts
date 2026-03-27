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
    gl = { isContextLost: () => false }
    resize() {}
    render() {}
    generateTexture() { return new MockTexture() }
    destroy() {}
  }
  return {
    Container: MockContainer,
    Sprite: MockSprite,
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

    it("does not create duplicate sprites when axis attribute change causes plotNum changes", async () => {
      // Reproduces the bug where changing an axis attribute (e.g., from previous_2_markov_moves
      // to your_move) causes plotNum values to change for some cases. syncWithCaseData returns
      // these as removed+added, then syncFromState creates sprites for the added points, and
      // then added.forEach creates duplicate sprites — leaving orphaned sprites at position (0,0).

      const sharedState = new PointsState()
      const pixiRenderer = new PixiPointRenderer(sharedState)

      // Initial plot: 5 cases spread across different plotNums (e.g., categorical X axis)
      const initialCases = [
        createCaseData(0, "case1"),
        createCaseData(1, "case2"),
        createCaseData(2, "case3"),
        createCaseData(3, "case4"),
        createCaseData(4, "case5")
      ]

      await pixiRenderer.init()
      pixiRenderer.matchPointsToData("ds1", initialCases, "points", defaultStyle)

      const sprites = (pixiRenderer as any).sprites as Map<string, any>
      const container = (pixiRenderer as any).pointsContainer as { children: any[] }
      expect(sprites.size).toBe(5)
      expect(container.children.length).toBe(5)

      // Change axis attribute: all cases now have plotNum=0 (single categorical value)
      // case1 keeps plotNum=0 (unchanged), cases 2-5 change plotNum → removed+added
      const newCases = [
        createCaseData(0, "case1"),
        createCaseData(0, "case2"),
        createCaseData(0, "case3"),
        createCaseData(0, "case4"),
        createCaseData(0, "case5")
      ]

      pixiRenderer.matchPointsToData("ds1", newCases, "points", defaultStyle)

      // Should have exactly 5 sprites — no duplicates
      expect(sprites.size).toBe(5)
      expect(container.children.length).toBe(5)
      expect(sharedState.size).toBe(5)

      // All sprites should correspond to state entries
      sprites.forEach((_sprite: any, pointId: string) => {
        expect(sharedState.getPoint(pointId)).toBeDefined()
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

    it("handles complete case replacement (all cases removed, all new cases added)", async () => {
      const sharedState = new PointsState()
      const pixiRenderer = new PixiPointRenderer(sharedState)

      const oldCases = [
        createCaseData(0, "case1"),
        createCaseData(0, "case2"),
        createCaseData(0, "case3")
      ]
      const newCases = [
        createCaseData(0, "case10"),
        createCaseData(0, "case11"),
        createCaseData(0, "case12"),
        createCaseData(0, "case13")
      ]

      await pixiRenderer.init()
      pixiRenderer.matchPointsToData("ds1", oldCases, "points", defaultStyle)

      const sprites = (pixiRenderer as any).sprites as Map<string, any>
      const container = (pixiRenderer as any).pointsContainer as { children: any[] }
      expect(sprites.size).toBe(3)
      expect(container.children.length).toBe(3)

      // Replace all cases with completely new ones (different count too)
      pixiRenderer.matchPointsToData("ds1", newCases, "points", defaultStyle)

      expect(sprites.size).toBe(4)
      expect(container.children.length).toBe(4)
      expect(sharedState.size).toBe(4)

      // All sprites should correspond to state entries
      sprites.forEach((_sprite: any, pointId: string) => {
        expect(sharedState.getPoint(pointId)).toBeDefined()
      })

      pixiRenderer.dispose()
    })

    it("handles plotNum increase (fewer categories to more categories)", async () => {
      // Reverse of the axis-change test: going from 1 category to many
      const sharedState = new PointsState()
      const pixiRenderer = new PixiPointRenderer(sharedState)

      // All cases in one plotNum
      const initialCases = [
        createCaseData(0, "case1"),
        createCaseData(0, "case2"),
        createCaseData(0, "case3")
      ]

      await pixiRenderer.init()
      pixiRenderer.matchPointsToData("ds1", initialCases, "points", defaultStyle)

      const sprites = (pixiRenderer as any).sprites as Map<string, any>
      const container = (pixiRenderer as any).pointsContainer as { children: any[] }
      expect(sprites.size).toBe(3)

      // Spread cases across multiple plotNums
      const newCases = [
        createCaseData(0, "case1"),
        createCaseData(1, "case2"),
        createCaseData(2, "case3")
      ]

      pixiRenderer.matchPointsToData("ds1", newCases, "points", defaultStyle)

      expect(sprites.size).toBe(3)
      expect(container.children.length).toBe(3)
      expect(sharedState.size).toBe(3)

      sprites.forEach((_sprite: any, pointId: string) => {
        expect(sharedState.getPoint(pointId)).toBeDefined()
      })

      pixiRenderer.dispose()
    })

    it("handles idempotent matchPointsToData calls without creating duplicates", async () => {
      const sharedState = new PointsState()
      const pixiRenderer = new PixiPointRenderer(sharedState)

      const cases = [
        createCaseData(0, "case1"),
        createCaseData(1, "case2"),
        createCaseData(2, "case3")
      ]

      await pixiRenderer.init()
      pixiRenderer.matchPointsToData("ds1", cases, "points", defaultStyle)

      const sprites = (pixiRenderer as any).sprites as Map<string, any>
      const container = (pixiRenderer as any).pointsContainer as { children: any[] }
      expect(sprites.size).toBe(3)
      expect(container.children.length).toBe(3)

      // Call again with identical data — should be a no-op
      pixiRenderer.matchPointsToData("ds1", cases, "points", defaultStyle)

      expect(sprites.size).toBe(3)
      expect(container.children.length).toBe(3)

      // And again
      pixiRenderer.matchPointsToData("ds1", cases, "points", defaultStyle)

      expect(sprites.size).toBe(3)
      expect(container.children.length).toBe(3)

      pixiRenderer.dispose()
    })

    it("handles empty case data (all points removed)", async () => {
      const sharedState = new PointsState()
      const pixiRenderer = new PixiPointRenderer(sharedState)

      const cases = [
        createCaseData(0, "case1"),
        createCaseData(0, "case2")
      ]

      await pixiRenderer.init()
      pixiRenderer.matchPointsToData("ds1", cases, "points", defaultStyle)

      const sprites = (pixiRenderer as any).sprites as Map<string, any>
      const container = (pixiRenderer as any).pointsContainer as { children: any[] }
      expect(sprites.size).toBe(2)

      // Remove all cases
      pixiRenderer.matchPointsToData("ds1", [], "points", defaultStyle)

      expect(sprites.size).toBe(0)
      expect(container.children.length).toBe(0)
      expect(sharedState.size).toBe(0)

      // Re-add cases — should work cleanly
      pixiRenderer.matchPointsToData("ds1", cases, "points", defaultStyle)

      expect(sprites.size).toBe(2)
      expect(container.children.length).toBe(2)
      expect(sharedState.size).toBe(2)

      pixiRenderer.dispose()
    })

    it("handles NullRenderer adding cases then PixiRenderer picking up with plotNum changes", async () => {
      // NullRenderer seeds state, then PixiRenderer initializes and immediately gets
      // different plotNums — combining both the NullRenderer race and axis-change scenarios
      const sharedState = new PointsState()
      const nullRenderer = new NullPointRenderer(sharedState)
      const pixiRenderer = new PixiPointRenderer(sharedState)

      // NullRenderer adds cases spread across plotNums
      const initialCases = [
        createCaseData(0, "case1"),
        createCaseData(1, "case2"),
        createCaseData(2, "case3")
      ]
      nullRenderer.matchPointsToData("ds1", initialCases, "points", defaultStyle)
      expect(sharedState.size).toBe(3)

      // PixiRenderer initializes — creates sprites from state via syncFromState
      await pixiRenderer.init()
      const sprites = (pixiRenderer as any).sprites as Map<string, any>
      const container = (pixiRenderer as any).pointsContainer as { children: any[] }
      expect(sprites.size).toBe(3)

      // NullRenderer changes axis — all cases to plotNum=0
      const newCases = [
        createCaseData(0, "case1"),
        createCaseData(0, "case2"),
        createCaseData(0, "case3")
      ]
      nullRenderer.matchPointsToData("ds1", newCases, "points", defaultStyle)
      expect(sharedState.size).toBe(3)
      // PixiRenderer still has old sprites (plotNum 0,1,2)
      expect(sprites.size).toBe(3)

      // PixiRenderer syncs — should clean up old sprites and create new ones
      pixiRenderer.matchPointsToData("ds1", newCases, "points", defaultStyle)

      expect(sprites.size).toBe(3)
      expect(container.children.length).toBe(3)
      expect(sharedState.size).toBe(3)

      sprites.forEach((_sprite: any, pointId: string) => {
        expect(sharedState.getPoint(pointId)).toBeDefined()
      })

      pixiRenderer.dispose()
    })
  })

  describe("display type transition", () => {
    it("activates transition state when switching from points to bars", async () => {
      const sharedState = new PointsState()
      const pixiRenderer = new PixiPointRenderer(sharedState)

      const cases = [
        createCaseData(0, "case1"),
        createCaseData(0, "case2"),
        createCaseData(0, "case3")
      ]

      await pixiRenderer.init()
      pixiRenderer.matchPointsToData("ds1", cases, "points", defaultStyle)

      const transitionState = (pixiRenderer as any).displayTypeTransitionState
      expect(transitionState.isActive).toBe(false)

      // Switch to bars — transition should activate
      pixiRenderer.matchPointsToData("ds1", cases, "bars", defaultStyle)
      expect(transitionState.isActive).toBe(true)

      pixiRenderer.dispose()
    })

    it("activates transition state when switching from bars to points", async () => {
      const sharedState = new PointsState()
      const pixiRenderer = new PixiPointRenderer(sharedState)

      const cases = [
        createCaseData(0, "case1"),
        createCaseData(0, "case2")
      ]

      await pixiRenderer.init()
      pixiRenderer.matchPointsToData("ds1", cases, "bars", defaultStyle)

      const transitionState = (pixiRenderer as any).displayTypeTransitionState
      expect(transitionState.isActive).toBe(false)

      // Switch to points — transition should activate
      pixiRenderer.matchPointsToData("ds1", cases, "points", defaultStyle)
      expect(transitionState.isActive).toBe(true)

      pixiRenderer.dispose()
    })

    it("does not activate transition when display type stays the same", async () => {
      const sharedState = new PointsState()
      const pixiRenderer = new PixiPointRenderer(sharedState)

      const cases = [
        createCaseData(0, "case1"),
        createCaseData(0, "case2")
      ]

      await pixiRenderer.init()
      pixiRenderer.matchPointsToData("ds1", cases, "points", defaultStyle)

      const transitionState = (pixiRenderer as any).displayTypeTransitionState
      expect(transitionState.isActive).toBe(false)

      // Same display type — no transition
      pixiRenderer.matchPointsToData("ds1", cases, "points", defaultStyle)
      expect(transitionState.isActive).toBe(false)

      pixiRenderer.dispose()
    })
  })
})
