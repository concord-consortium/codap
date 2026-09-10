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
    hitArea: any = null
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
    // records what was traced, so a test can tell a polygon from an arc
    traced: Array<{ op: string, args: any[] }> = []
    rect(...args: any[]) { this.traced.push({ op: "rect", args }); return this }
    circle(...args: any[]) { this.traced.push({ op: "circle", args }); return this }
    poly(...args: any[]) { this.traced.push({ op: "poly", args }); return this }
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
    extract = {
      canvas: jest.fn(() => {
        const canvas = document.createElement("canvas")
        canvas.width = 200
        canvas.height = 150
        return canvas
      })
    }
    resize() {}
    render() {}
    // keeps every call, so a test can inspect the graphics traced and the frame requested
    generateTextureCalls: any[] = []
    generateTexture(options: any) {
      this.generateTextureCalls.push(options)
      return new MockTexture()
    }
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

  describe("point shapes", () => {
    const setUp = async (style: IPointStyle) => {
      const pixiRenderer = new PixiPointRenderer(new PointsState())
      await pixiRenderer.init()
      pixiRenderer.matchPointsToData("dataset1", [createCaseData(0, "case1")], "points", style)
      const renderer = (pixiRenderer as any).renderer
      const sprite = (pixiRenderer as any).sprites.get(
        (pixiRenderer as any).state.getPointIdForCaseData(createCaseData(0, "case1"))
      )
      return { pixiRenderer, renderer, sprite }
    }

    const lastTexture = (renderer: any) =>
      renderer.generateTextureCalls[renderer.generateTextureCalls.length - 1]

    it("traces the shape's polygon rather than an arc", async () => {
      const { renderer } = await setUp({ ...defaultStyle, shape: "square" })
      const traced = lastTexture(renderer).target.traced.map((t: any) => t.op)

      expect(traced).toContain("poly")
      expect(traced).not.toContain("circle")
    })

    it("still draws a circle as an arc, as it always has", async () => {
      // the shape CODAP has always drawn keeps its own path, including sizing its own texture
      const { renderer } = await setUp(defaultStyle)
      const call = lastTexture(renderer)

      expect(call.target.traced.map((t: any) => t.op)).toContain("circle")
      expect(call.frame).toBeUndefined()
    })

    it("centers a triangle's texture on the point rather than on its ink", async () => {
      /*
       * The sprite's anchor sits at the middle of its texture, so a texture sized to the ink would
       * put the middle of a triangle's ink on the point -- and a triangle is centered on its center
       * of area, which is not the middle of its outline. It would be drawn low.
       */
      const { renderer } = await setUp({ ...defaultStyle, shape: "triangle" })
      const { frame } = lastTexture(renderer)

      expect(frame).toBeDefined()
      expect(frame.x + frame.width / 2).toBeCloseTo(0, 6)
      expect(frame.y + frame.height / 2).toBeCloseTo(0, 6)
    })

    it("gives two shapes two textures rather than sharing one", async () => {
      // the texture cache keys on the whole style, so a shape cannot collide with another
      const { pixiRenderer, renderer } = await setUp({ ...defaultStyle, shape: "square" })
      const before = renderer.generateTextureCalls.length
      const pointId = (pixiRenderer as any).sprites.keys().next().value
      ;(pixiRenderer as any).doSetPointStyle(pointId, { shape: "star" })

      expect(renderer.generateTextureCalls.length).toBe(before + 1)
      expect(lastTexture(renderer).target.traced.map((t: any) => t.op)).toContain("poly")
    })

    describe("hit area", () => {
      it("tests the drawn shape rather than the sprite's rectangle", async () => {
        const { sprite } = await setUp({ ...defaultStyle, shape: "star", radius: 8 })

        // straight up along a tip, past the radius but on the ink
        expect(sprite.hitArea.contains(0, -10)).toBe(true)
        // the same distance out between two arms, where the star is not drawn
        const rad = -54 * Math.PI / 180
        expect(sprite.hitArea.contains(Math.cos(rad) * 10, Math.sin(rad) * 10)).toBe(false)
      })

      it("keeps every shape at least as easy to hit as a circle", async () => {
        const { sprite } = await setUp({ ...defaultStyle, shape: "plus", radius: 8 })

        for (let deg = 0; deg < 360; deg += 30) {
          const rad = deg * Math.PI / 180
          expect(sprite.hitArea.contains(Math.cos(rad) * 7.9, Math.sin(rad) * 7.9)).toBe(true)
        }
      })

      it("follows the shape when the style changes", async () => {
        const { pixiRenderer, sprite } = await setUp({ ...defaultStyle, shape: "circle", radius: 8 })
        expect(sprite.hitArea.contains(0, -10)).toBe(false)

        const pointId = (pixiRenderer as any).sprites.keys().next().value
        ;(pixiRenderer as any).doSetPointStyle(pointId, { shape: "star" })

        // the tip is on the ink now, so the same click that missed the circle hits the star
        expect(sprite.hitArea.contains(0, -10)).toBe(true)
      })

      it("leaves bars to the sprite's own rectangular test", async () => {
        // a bar is a rectangle, which is exactly what a sprite hit tests against by default
        const pixiRenderer = new PixiPointRenderer(new PointsState())
        await pixiRenderer.init()
        pixiRenderer.matchPointsToData("dataset1", [createCaseData(0, "case1")], "bars",
          { ...defaultStyle, width: 20, height: 40 })
        const sprite = (pixiRenderer as any).sprites.values().next().value

        expect(sprite.hitArea).toBeNull()
      })
    })
  })

  describe("setPointsInteractive", () => {
    it("toggles hit-testing of the points container", async () => {
      const pixiRenderer = new PixiPointRenderer(new PointsState())
      await pixiRenderer.init()
      const container = (pixiRenderer as any).pointsContainer

      pixiRenderer.setPointsInteractive(false)
      expect(container.interactiveChildren).toBe(false)

      pixiRenderer.setPointsInteractive(true)
      expect(container.interactiveChildren).toBe(true)
    })

    it("is a harmless no-op on renderers that don't override it", () => {
      const nullRenderer = new NullPointRenderer(new PointsState())
      expect(() => nullRenderer.setPointsInteractive(false)).not.toThrow()
    })
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

    it("updates sprite masks and state subPlotNums during a bars→points transition (CODAP-1214)", async () => {
      // CODAP-1214: a coincident subplot layout change (new categorical axis) must be picked up
      // during a bars→points transition; otherwise sprites stay masked to their old bar-chart cells.
      const sharedState = new PointsState()
      const pixiRenderer = new PixiPointRenderer(sharedState)
      await pixiRenderer.init()

      // Start as a bar chart with all cases in subplot 0 (single categorical x-axis)
      const barCases = [
        createCaseData(0, "case1", 0),
        createCaseData(0, "case2", 0),
        createCaseData(0, "case3", 0)
      ]
      pixiRenderer.matchPointsToData("ds1", barCases, "bars", defaultStyle)

      // Resize the renderer to create a 3x3 subplot layout (9 masks) — simulates the layout
      // that would exist after a second categorical axis is added
      pixiRenderer.resize(300, 300, 3, 3, 1, 1)
      const subPlotMasks = (pixiRenderer as any).subPlotMasks as any[]
      expect(subPlotMasks.length).toBe(9)

      // Transition to dot chart with each case mapped to a different subplot
      const dotCases = [
        createCaseData(0, "case1", 0),
        createCaseData(0, "case2", 4),
        createCaseData(0, "case3", 8)
      ]
      pixiRenderer.matchPointsToData("ds1", dotCases, "points", defaultStyle)

      const transitionState = (pixiRenderer as any).displayTypeTransitionState
      expect(transitionState.isActive).toBe(true)

      const sprites = (pixiRenderer as any).sprites as Map<string, any>
      const id1 = sharedState.getPointIdForCaseData({ plotNum: 0, caseID: "case1" })!
      const id2 = sharedState.getPointIdForCaseData({ plotNum: 0, caseID: "case2" })!
      const id3 = sharedState.getPointIdForCaseData({ plotNum: 0, caseID: "case3" })!

      expect(sprites.get(id1)?.mask).toBe(subPlotMasks[0])
      expect(sprites.get(id2)?.mask).toBe(subPlotMasks[4])
      expect(sprites.get(id3)?.mask).toBe(subPlotMasks[8])

      expect(sharedState.getPoint(id1)?.subPlotNum).toBe(0)
      expect(sharedState.getPoint(id2)?.subPlotNum).toBe(4)
      expect(sharedState.getPoint(id3)?.subPlotNum).toBe(8)

      pixiRenderer.dispose()
    })
  })

  describe("snapshotCanvas", () => {
    it("returns null when renderer is not initialized", () => {
      const pixiRenderer = new PixiPointRenderer()
      expect(pixiRenderer.snapshotCanvas()).toBeNull()
    })

    it("returns the canvas extracted from PIXI's extract API when initialized", async () => {
      const pixiRenderer = new PixiPointRenderer()
      await pixiRenderer.init()
      const snapshot = pixiRenderer.snapshotCanvas()
      expect(snapshot).not.toBeNull()
      expect(snapshot?.width).toBe(200)
      expect(snapshot?.height).toBe(150)
      pixiRenderer.dispose()
    })

    it("returns null and warns when the extract call throws", async () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {})
      const pixiRenderer = new PixiPointRenderer()
      await pixiRenderer.init()
      const mockExtract = (pixiRenderer as any).renderer.extract.canvas as jest.Mock
      mockExtract.mockImplementationOnce(() => { throw new Error("WebGL context lost") })
      expect(pixiRenderer.snapshotCanvas()).toBeNull()
      expect(warnSpy).toHaveBeenCalledWith(
        "[PixiPointRenderer] snapshotCanvas extract failed:",
        expect.any(Error)
      )
      warnSpy.mockRestore()
      pixiRenderer.dispose()
    })
  })
})
