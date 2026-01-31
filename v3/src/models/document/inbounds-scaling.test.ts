import { InBoundsScaling, inBoundsScaling } from "./inbounds-scaling"

describe("InBoundsScaling", () => {
  let scaling: InBoundsScaling

  beforeEach(() => {
    scaling = new InBoundsScaling()
  })

  describe("initial state", () => {
    it("has default values", () => {
      expect(scaling.scaleFactor).toBe(1)
      expect(scaling.scaleBoundsX).toBe(0)
      expect(scaling.scaleBoundsY).toBe(0)
      expect(scaling.containerWidth).toBe(0)
      expect(scaling.containerHeight).toBe(0)
      expect(scaling.isScaled).toBe(false)
      expect(scaling.isResizing).toBe(false)
    })
  })

  describe("setContainerSize", () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it("sets container dimensions", () => {
      scaling.setContainerSize(800, 600)
      expect(scaling.containerWidth).toBe(800)
      expect(scaling.containerHeight).toBe(600)
    })

    it("does not set isResizing on initial measurement", () => {
      expect(scaling.isResizing).toBe(false)
      scaling.setContainerSize(800, 600)
      // Initial measurement should not trigger isResizing (no previous size)
      expect(scaling.isResizing).toBe(false)
    })

    it("does not set isResizing when size is unchanged", () => {
      scaling.setContainerSize(800, 600)
      expect(scaling.isResizing).toBe(false)

      // Same size should not trigger isResizing
      scaling.setContainerSize(800, 600)
      expect(scaling.isResizing).toBe(false)
    })

    it("sets isResizing to true when size actually changes", () => {
      // Initial measurement
      scaling.setContainerSize(800, 600)
      expect(scaling.isResizing).toBe(false)

      // Actual resize (different size) should set isResizing
      scaling.setContainerSize(900, 700)
      expect(scaling.isResizing).toBe(true)
    })

    it("clears isResizing after debounce delay", () => {
      // Initial measurement
      scaling.setContainerSize(800, 600)

      // Actual resize
      scaling.setContainerSize(900, 700)
      expect(scaling.isResizing).toBe(true)

      jest.advanceTimersByTime(149)
      expect(scaling.isResizing).toBe(true)

      jest.advanceTimersByTime(1)
      expect(scaling.isResizing).toBe(false)
    })

    it("resets debounce timer on subsequent resize calls", () => {
      // Initial measurement
      scaling.setContainerSize(800, 600)

      // First actual resize
      scaling.setContainerSize(900, 700)
      expect(scaling.isResizing).toBe(true)

      jest.advanceTimersByTime(100)
      expect(scaling.isResizing).toBe(true)

      // Another resize call resets the timer
      scaling.setContainerSize(1000, 800)
      expect(scaling.isResizing).toBe(true)

      // 100ms from second resize, timer should not have fired yet
      jest.advanceTimersByTime(100)
      expect(scaling.isResizing).toBe(true)

      // 150ms from second resize, timer should fire
      jest.advanceTimersByTime(50)
      expect(scaling.isResizing).toBe(false)
    })
  })

  describe("setResizing", () => {
    it("sets isResizing directly", () => {
      expect(scaling.isResizing).toBe(false)
      scaling.setResizing(true)
      expect(scaling.isResizing).toBe(true)
      scaling.setResizing(false)
      expect(scaling.isResizing).toBe(false)
    })
  })

  describe("setScaleBounds", () => {
    it("sets scale bounds", () => {
      scaling.setScaleBounds(1000, 800)
      expect(scaling.scaleBoundsX).toBe(1000)
      expect(scaling.scaleBoundsY).toBe(800)
    })
  })

  describe("setScaleFactor", () => {
    it("sets scale factor directly", () => {
      scaling.setScaleFactor(0.5)
      expect(scaling.scaleFactor).toBe(0.5)
    })

    it("clamps scale factor to maximum of 1", () => {
      scaling.setScaleFactor(1.5)
      expect(scaling.scaleFactor).toBe(1)
    })

    it("clamps scale factor to minimum of 0.1", () => {
      scaling.setScaleFactor(0.05)
      expect(scaling.scaleFactor).toBe(0.1)
    })
  })

  describe("isScaled", () => {
    it("returns true when scale factor is less than 1", () => {
      scaling.setScaleFactor(0.8)
      expect(scaling.isScaled).toBe(true)
    })

    it("returns false when scale factor is 1", () => {
      scaling.setScaleFactor(1)
      expect(scaling.isScaled).toBe(false)
    })
  })

  describe("recomputeScaleFactor", () => {
    it("returns 1 when bounds are not set", () => {
      scaling.setContainerSize(800, 600)
      scaling.recomputeScaleFactor()
      expect(scaling.scaleFactor).toBe(1)
    })

    it("returns 1 when container is large enough", () => {
      scaling.setContainerSize(1000, 800)
      scaling.setScaleBounds(500, 400)
      scaling.recomputeScaleFactor()
      expect(scaling.scaleFactor).toBe(1)
    })

    it("returns 1 when container exactly matches bounds", () => {
      scaling.setContainerSize(500, 400)
      scaling.setScaleBounds(500, 400)
      scaling.recomputeScaleFactor()
      expect(scaling.scaleFactor).toBe(1)
    })

    it("computes scale factor when container is too small", () => {
      scaling.setContainerSize(400, 320)
      scaling.setScaleBounds(800, 640)
      scaling.recomputeScaleFactor()
      expect(scaling.scaleFactor).toBe(0.5)
    })

    it("uses the smaller ratio for uniform scaling", () => {
      // Width ratio = 400/800 = 0.5, Height ratio = 640/640 = 1.0
      scaling.setContainerSize(400, 640)
      scaling.setScaleBounds(800, 640)
      scaling.recomputeScaleFactor()
      expect(scaling.scaleFactor).toBe(0.5)

      // Width ratio = 800/800 = 1.0, Height ratio = 320/640 = 0.5
      scaling.setContainerSize(800, 320)
      scaling.setScaleBounds(800, 640)
      scaling.recomputeScaleFactor()
      expect(scaling.scaleFactor).toBe(0.5)
    })

    it("enforces minimum scale factor", () => {
      scaling.setContainerSize(10, 10)
      scaling.setScaleBounds(1000, 1000)
      scaling.recomputeScaleFactor()
      expect(scaling.scaleFactor).toBe(0.1)
    })
  })

  describe("reset", () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it("resets all values to defaults", () => {
      scaling.setContainerSize(800, 600)
      scaling.setScaleBounds(1000, 800)
      scaling.setScaleFactor(0.5)

      scaling.reset()

      expect(scaling.scaleFactor).toBe(1)
      expect(scaling.scaleBoundsX).toBe(0)
      expect(scaling.scaleBoundsY).toBe(0)
      expect(scaling.containerWidth).toBe(0)
      expect(scaling.containerHeight).toBe(0)
      expect(scaling.isResizing).toBe(false)
    })

    it("clears pending resize timer", () => {
      // Initial measurement
      scaling.setContainerSize(800, 600)
      // Actual resize to start timer
      scaling.setContainerSize(900, 700)
      expect(scaling.isResizing).toBe(true)

      scaling.reset()
      expect(scaling.isResizing).toBe(false)

      // Advancing timers should not change isResizing since timer was cleared
      jest.advanceTimersByTime(200)
      expect(scaling.isResizing).toBe(false)
    })
  })

  describe("singleton instance", () => {
    it("exports a singleton", () => {
      expect(inBoundsScaling).toBeInstanceOf(InBoundsScaling)
    })
  })
})
