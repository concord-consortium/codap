import { GraphLayout } from "./graph-layout"
import { kDefaultTileWidth, kDefaultTileHeight } from "../../data-display/models/data-display-layout"

// Mock measureTextExtent to avoid DOM dependencies
jest.mock("../../../hooks/use-measure-text", () => ({
  measureTextExtent: jest.fn(() => ({ width: 10, height: 14 }))
}))

describe("GraphLayout", () => {
  let layout: GraphLayout

  beforeEach(() => {
    layout = new GraphLayout()
  })

  afterEach(() => {
    layout.cleanup()
  })

  describe("constructor and initialization", () => {
    it("should create an instance with default values", () => {
      expect(layout.tileWidth).toBe(kDefaultTileWidth)
      expect(layout.tileHeight).toBe(kDefaultTileHeight)
      expect(layout.bannerHeights.size).toBe(0)
    })

    it("should initialize axis scales for all axis places", () => {
      expect(layout.getAxisMultiScale("left")).toBeDefined()
      expect(layout.getAxisMultiScale("bottom")).toBeDefined()
      expect(layout.getAxisMultiScale("top")).toBeDefined()
      expect(layout.getAxisMultiScale("rightCat")).toBeDefined()
      expect(layout.getAxisMultiScale("rightNumeric")).toBeDefined()
    })
  })

  describe("banner registration", () => {
    it("should register a banner with height and order", () => {
      layout.registerBanner("test-banner", 30, 1)
      expect(layout.bannerHeights.size).toBe(1)
      expect(layout.bannerHeights.get("test-banner")).toEqual({ height: 30, order: 1 })
    })

    it("should register multiple banners", () => {
      layout.registerBanner("banner1", 20, 1)
      layout.registerBanner("banner2", 30, 2)
      layout.registerBanner("banner3", 15, 0)
      expect(layout.bannerHeights.size).toBe(3)
    })

    it("should allow updating an existing banner", () => {
      layout.registerBanner("test-banner", 30, 1)
      layout.registerBanner("test-banner", 50, 2)
      expect(layout.bannerHeights.size).toBe(1)
      expect(layout.bannerHeights.get("test-banner")).toEqual({ height: 50, order: 2 })
    })

    it("should unregister a banner", () => {
      layout.registerBanner("test-banner", 30, 1)
      expect(layout.bannerHeights.size).toBe(1)
      layout.unregisterBanner("test-banner")
      expect(layout.bannerHeights.size).toBe(0)
    })

    it("should handle unregistering a non-existent banner gracefully", () => {
      layout.unregisterBanner("non-existent")
      expect(layout.bannerHeights.size).toBe(0)
    })
  })

  describe("totalBannersHeight", () => {
    it("should return 0 when no banners are registered", () => {
      expect(layout.totalBannersHeight).toBe(0)
    })

    it("should return correct height for a single banner", () => {
      layout.registerBanner("test-banner", 30, 1)
      expect(layout.totalBannersHeight).toBe(30)
    })

    it("should sum heights of multiple banners", () => {
      layout.registerBanner("banner1", 20, 1)
      layout.registerBanner("banner2", 30, 2)
      layout.registerBanner("banner3", 15, 0)
      expect(layout.totalBannersHeight).toBe(65)
    })

    it("should update when a banner is unregistered", () => {
      layout.registerBanner("banner1", 20, 1)
      layout.registerBanner("banner2", 30, 2)
      expect(layout.totalBannersHeight).toBe(50)
      layout.unregisterBanner("banner1")
      expect(layout.totalBannersHeight).toBe(30)
    })
  })

  describe("computedBounds", () => {
    beforeEach(() => {
      layout.setTileExtent(400, 300)
    })

    it("should compute plot bounds without banners", () => {
      const bounds = layout.computedBounds
      expect(bounds.plot.left).toBe(20)
      expect(bounds.plot.top).toBe(0)
      expect(bounds.plot.width).toBe(380)
      expect(bounds.plot.height).toBe(280)
    })

    it("should reduce plot height when banners are registered", () => {
      layout.registerBanner("test-banner", 30, 1)
      const bounds = layout.computedBounds
      expect(bounds.plot.top).toBe(30)
      expect(bounds.plot.height).toBe(250)
    })

    it("should position left axis correctly with banners", () => {
      layout.registerBanner("test-banner", 30, 1)
      const bounds = layout.computedBounds
      expect(bounds.left.top).toBe(30)
      expect(bounds.left.height).toBe(250)
    })

    it("should position bottom axis correctly with banners", () => {
      layout.registerBanner("test-banner", 30, 1)
      const bounds = layout.computedBounds
      expect(bounds.bottom.top).toBe(280) // 30 (banner) + 250 (plot)
    })

    it("should compute bounds correctly with multiple extents set", () => {
      layout.setDesiredExtent("left", 60)
      layout.setDesiredExtent("bottom", 40)
      layout.registerBanner("test-banner", 25, 1)

      const bounds = layout.computedBounds
      expect(bounds.left.width).toBe(60)
      expect(bounds.bottom.height).toBe(40)
      expect(bounds.plot.left).toBe(60)
      expect(bounds.plot.top).toBe(25)
      expect(bounds.plot.width).toBe(340) // 400 - 60
      expect(bounds.plot.height).toBe(235) // 300 - 25 - 40
    })

    it("should account for right axis extents", () => {
      layout.setDesiredExtent("rightNumeric", 50)
      const bounds = layout.computedBounds
      expect(bounds.plot.width).toBe(330) // 400 - 20 (left default) - 50
      expect(bounds.rightNumeric.width).toBe(50)
      expect(bounds.rightNumeric.left).toBe(350) // 20 + 330
    })

    it("should account for legend height", () => {
      layout.setDesiredExtent("legend", 30)
      const bounds = layout.computedBounds
      expect(bounds.plot.height).toBe(250) // 300 - 20 (bottom default) - 30 (legend)
      expect(bounds.legend.height).toBe(30)
      expect(bounds.legend.top).toBe(270) // 300 - 30
    })

    it("should position top axis correctly with banners", () => {
      layout.setDesiredExtent("top", 35)
      layout.registerBanner("test-banner", 20, 1)
      const bounds = layout.computedBounds
      expect(bounds.top.top).toBe(20) // banner height
      expect(bounds.top.height).toBe(35)
      expect(bounds.plot.top).toBe(55) // 20 + 35
    })

    it("should provide banners bounds", () => {
      layout.setDesiredExtent("top", 25)
      const bounds = layout.computedBounds
      expect(bounds.banners.top).toBe(0)
      expect(bounds.banners.height).toBe(25)
    })
  })

  describe("setTileExtent", () => {
    it("should update tile dimensions", () => {
      layout.setTileExtent(500, 400)
      expect(layout.tileWidth).toBe(500)
      expect(layout.tileHeight).toBe(400)
      expect(layout.isTileExtentInitialized).toBe(true)
    })

    it("should not update for negative dimensions", () => {
      layout.setTileExtent(500, 400)
      layout.setTileExtent(-100, 200)
      expect(layout.tileWidth).toBe(500)
      expect(layout.tileHeight).toBe(400)
    })

    it("should update plotWidth and plotHeight", () => {
      layout.setTileExtent(500, 400)
      expect(layout.plotWidth).toBe(480) // 500 - 20 (left default)
      expect(layout.plotHeight).toBe(380) // 400 - 20 (bottom default)
    })
  })

  describe("setDesiredExtent", () => {
    beforeEach(() => {
      layout.setTileExtent(600, 400)
    })

    it("should set extent for left axis", () => {
      layout.setDesiredExtent("left", 80)
      expect(layout.getDesiredExtent("left")).toBe(80)
    })

    it("should set extent for bottom axis", () => {
      layout.setDesiredExtent("bottom", 50)
      expect(layout.getDesiredExtent("bottom")).toBe(50)
    })

    it("should constrain axis extent to maximum of 2/5 tile dimension plus label height", () => {
      // For left axis, max is labelHeight + 2 * tileWidth / 5 = 14 + 2 * 600 / 5 = 14 + 240 = 254
      layout.setDesiredExtent("left", 300)
      expect(layout.getDesiredExtent("left")).toBeLessThanOrEqual(254)
    })

    it("should allow small extents without applying minimum", () => {
      layout.setDesiredExtent("left", 20)
      expect(layout.getDesiredExtent("left")).toBe(20)
    })

    it("should store the original desired extent from component", () => {
      layout.setDesiredExtent("left", 100)
      expect(layout.desiredExtentsFromComponents.get("left")).toBe(100)
    })
  })

  describe("plotWidth and plotHeight", () => {
    it("should return correct plot width based on computed bounds", () => {
      layout.setTileExtent(400, 300)
      layout.setDesiredExtent("left", 50)
      expect(layout.plotWidth).toBe(350) // 400 - 50
    })

    it("should return correct plot height based on computed bounds", () => {
      layout.setTileExtent(400, 300)
      layout.setDesiredExtent("bottom", 40)
      layout.registerBanner("banner", 20, 1)
      expect(layout.plotHeight).toBe(240) // 300 - 40 - 20
    })
  })

  describe("getAxisLength", () => {
    beforeEach(() => {
      layout.setTileExtent(400, 300)
    })

    it("should return plot height for vertical axes", () => {
      expect(layout.getAxisLength("left")).toBe(layout.plotHeight)
      expect(layout.getAxisLength("rightCat")).toBe(layout.plotHeight)
      expect(layout.getAxisLength("rightNumeric")).toBe(layout.plotHeight)
    })

    it("should return plot width for horizontal axes", () => {
      expect(layout.getAxisLength("bottom")).toBe(layout.plotWidth)
      expect(layout.getAxisLength("top")).toBe(layout.plotWidth)
    })
  })

  describe("axis scale management", () => {
    it("should set axis scale type", () => {
      layout.setAxisScaleType("left", "linear")
      const scale = layout.getAxisMultiScale("left")
      expect(scale.scaleType).toBe("linear")
    })

    it("should reset axis scale", () => {
      layout.setAxisScaleType("left", "linear")
      layout.resetAxisScale("left")
      const scale = layout.getAxisMultiScale("left")
      expect(scale.scaleType).toBe("ordinal")
    })

    it("should return the axis scale for a place", () => {
      layout.setAxisScaleType("bottom", "linear")
      const scale = layout.getAxisScale("bottom")
      expect(scale).toBeDefined()
    })

    it("should return numeric scale for numeric axis", () => {
      layout.setAxisScaleType("left", "linear")
      const numericScale = layout.getNumericScale("left")
      expect(numericScale).toBeDefined()
    })

    it("should return band scale for band axis", () => {
      layout.setAxisScaleType("bottom", "band")
      const bandScale = layout.getBandScale("bottom")
      expect(bandScale).toBeDefined()
    })
  })

  describe("axis bounds", () => {
    it("should return undefined for unset axis bounds", () => {
      expect(layout.getAxisBounds("left")).toBeUndefined()
    })
  })

  describe("numRows and numColumns", () => {
    it("should return default values of 1", () => {
      expect(layout.numRows).toBe(1)
      expect(layout.numColumns).toBe(1)
    })

    it("should return repetitions from left scale for numRows", () => {
      const leftScale = layout.getAxisMultiScale("left")
      leftScale.setRepetitions(3)
      expect(layout.numRows).toBe(3)
    })

    it("should return repetitions from bottom scale for numColumns", () => {
      const bottomScale = layout.getAxisMultiScale("bottom")
      bottomScale.setRepetitions(2)
      expect(layout.numColumns).toBe(2)
    })
  })

  describe("categorySetArrays", () => {
    it("should return arrays of category values from all scales", () => {
      const arrays = layout.categorySetArrays
      expect(Array.isArray(arrays)).toBe(true)
      expect(arrays.length).toBe(5) // one for each axis place
    })
  })

  describe("cleanup", () => {
    it("should dispose reaction without error", () => {
      expect(() => layout.cleanup()).not.toThrow()
    })

    it("should handle multiple cleanup calls gracefully", () => {
      layout.cleanup()
      expect(() => layout.cleanup()).not.toThrow()
    })
  })

  describe("content dimensions", () => {
    it("contentWidth should return plot width from computed bounds", () => {
      layout.setTileExtent(400, 300)
      expect(layout.contentWidth).toBe(layout.computedBounds.plot.width)
    })

    it("contentHeight should return plot height from computed bounds", () => {
      layout.setTileExtent(400, 300)
      expect(layout.contentHeight).toBe(layout.computedBounds.plot.height)
    })
  })
})
