import { CanvasTransition, CanvasTransitionManager } from "./canvas-transition"

describe("CanvasTransition", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe("construction", () => {
    it("creates transition with duration", () => {
      const transition = new CanvasTransition(1000)
      expect(transition.duration).toBe(1000)
    })

    it("sets start time to current time", () => {
      const now = performance.now()
      const transition = new CanvasTransition(1000)
      expect(transition.startTime).toBe(now)
    })
  })

  describe("getProgress", () => {
    it("returns 0 at start time", () => {
      const transition = new CanvasTransition(1000)
      const progress = transition.getProgress(transition.startTime)
      expect(progress).toBe(0)
    })

    it("returns 1 at end time", () => {
      const transition = new CanvasTransition(1000)
      const progress = transition.getProgress(transition.startTime + 1000)
      expect(progress).toBe(1)
    })

    it("returns smoothed value at midpoint", () => {
      const transition = new CanvasTransition(1000)
      const progress = transition.getProgress(transition.startTime + 500)

      // At t=0.5, smoother(0.5) = 0.5^3 * (0.5 * (0.5 * 6 - 15) + 10)
      // = 0.125 * (0.5 * (-12) + 10) = 0.125 * (-6 + 10) = 0.125 * 4 = 0.5
      expect(progress).toBeCloseTo(0.5, 5)
    })

    it("clamps progress to 1 when past duration", () => {
      const transition = new CanvasTransition(1000)
      const progress = transition.getProgress(transition.startTime + 2000)
      expect(progress).toBe(1)
    })

    it("uses smoother interpolation (ease-in-out)", () => {
      const transition = new CanvasTransition(1000)

      // At t=0.25, raw ratio = 0.25
      // smoother(0.25) should be less than 0.25 (ease-in at start)
      const earlyProgress = transition.getProgress(transition.startTime + 250)
      expect(earlyProgress).toBeLessThan(0.25)

      // At t=0.75, raw ratio = 0.75
      // smoother(0.75) should be greater than 0.75 (ease-out at end)
      const lateProgress = transition.getProgress(transition.startTime + 750)
      expect(lateProgress).toBeGreaterThan(0.75)
    })
  })

  describe("isComplete", () => {
    it("returns false before duration elapses", () => {
      const transition = new CanvasTransition(1000)
      expect(transition.isComplete(transition.startTime + 500)).toBe(false)
    })

    it("returns true when duration elapses", () => {
      const transition = new CanvasTransition(1000)
      expect(transition.isComplete(transition.startTime + 1000)).toBe(true)
    })

    it("returns true after duration", () => {
      const transition = new CanvasTransition(1000)
      expect(transition.isComplete(transition.startTime + 1500)).toBe(true)
    })
  })

  describe("handleOnEnd", () => {
    it("calls completion callback", () => {
      const callback = jest.fn()
      const transition = new CanvasTransition(1000, callback)

      transition.handleOnEnd()

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it("only calls callback once", () => {
      const callback = jest.fn()
      const transition = new CanvasTransition(1000, callback)

      transition.handleOnEnd()
      transition.handleOnEnd()
      transition.handleOnEnd()

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it("handles missing callback gracefully", () => {
      const transition = new CanvasTransition(1000)
      expect(() => transition.handleOnEnd()).not.toThrow()
    })
  })
})

describe("CanvasTransitionManager", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe("construction", () => {
    it("creates manager with no active transitions", () => {
      const manager = new CanvasTransitionManager()
      expect(manager.hasActiveTransitions()).toBe(false)
    })
  })

  describe("beginTransition / endTransition", () => {
    it("tracks transition setup state", () => {
      const manager = new CanvasTransitionManager()

      expect(manager.isSettingUpTransition()).toBe(false)

      manager.beginTransition(1000)
      expect(manager.isSettingUpTransition()).toBe(true)

      manager.endTransition()
      expect(manager.isSettingUpTransition()).toBe(false)
    })
  })

  describe("setTarget", () => {
    it("ignores targets set outside transition", () => {
      const manager = new CanvasTransitionManager()

      manager.setTarget("p1", "x", 0, 100)

      expect(manager.hasActiveTransitions()).toBe(false)
    })

    it("adds targets during transition setup", () => {
      const manager = new CanvasTransitionManager()

      manager.beginTransition(1000)
      manager.setTarget("p1", "x", 0, 100)
      manager.endTransition()

      expect(manager.hasActiveTransitions()).toBe(true)
    })

    it("supports multiple properties per point", () => {
      const manager = new CanvasTransitionManager()

      manager.beginTransition(1000)
      manager.setTarget("p1", "x", 0, 100)
      manager.setTarget("p1", "y", 0, 200)
      manager.setTarget("p1", "scale", 0, 1)
      manager.endTransition()

      expect(manager.hasActiveTransitions()).toBe(true)
    })

    it("supports multiple points", () => {
      const manager = new CanvasTransitionManager()

      manager.beginTransition(1000)
      manager.setTarget("p1", "x", 0, 100)
      manager.setTarget("p2", "x", 0, 200)
      manager.setTarget("p3", "x", 0, 300)
      manager.endTransition()

      expect(manager.hasActiveTransitions()).toBe(true)
    })

    it("preserves original start value when overwriting active transition", () => {
      const manager = new CanvasTransitionManager()

      // First transition: p1.x from 0 to 100
      manager.beginTransition(1000)
      manager.setTarget("p1", "x", 0, 100)
      manager.endTransition()

      // Second transition: p1.x to 200 (should preserve original start of 0)
      manager.beginTransition(1000)
      manager.setTarget("p1", "x", 50, 200) // startValue=50 should be ignored
      manager.endTransition()

      // The start value should still be 0 (the original)
      const results = manager.step()
      const xValue = results.get("p1")?.get("x")
      // At progress ~0, value should be close to 0, not 50
      expect(xValue).toBeLessThan(10)
    })
  })

  describe("step", () => {
    it("returns empty map when no transitions", () => {
      const manager = new CanvasTransitionManager()

      const results = manager.step()

      expect(results.size).toBe(0)
    })

    it("returns interpolated values for active transitions", () => {
      const manager = new CanvasTransitionManager()

      manager.beginTransition(1000)
      manager.setTarget("p1", "x", 0, 100)
      manager.setTarget("p1", "y", 0, 200)
      manager.endTransition()

      const results = manager.step()

      expect(results.has("p1")).toBe(true)
      const p1Props = results.get("p1")!
      expect(p1Props.has("x")).toBe(true)
      expect(p1Props.has("y")).toBe(true)
    })

    it("returns values progressing from start to target", () => {
      const manager = new CanvasTransitionManager()

      manager.beginTransition(1000)
      manager.setTarget("p1", "x", 0, 100)
      manager.endTransition()

      // Step immediately (t=0)
      const earlyResults = manager.step()
      const earlyX = earlyResults.get("p1")?.get("x") ?? 0

      // Advance time and step again (t=500)
      jest.advanceTimersByTime(500)
      const midResults = manager.step()
      const midX = midResults.get("p1")?.get("x") ?? 0

      // Advance to end (t=1000)
      jest.advanceTimersByTime(500)
      const lateResults = manager.step()
      const lateX = lateResults.get("p1")?.get("x") ?? 0

      // Values should progress
      expect(earlyX).toBeCloseTo(0, 0)
      expect(midX).toBeCloseTo(50, 0) // smoother(0.5) = 0.5
      expect(lateX).toBeCloseTo(100, 0)
    })

    it("removes completed transitions", () => {
      const manager = new CanvasTransitionManager()

      manager.beginTransition(1000)
      manager.setTarget("p1", "x", 0, 100)
      manager.endTransition()

      expect(manager.hasActiveTransitions()).toBe(true)

      // Advance past duration
      jest.advanceTimersByTime(1000)
      manager.step()

      expect(manager.hasActiveTransitions()).toBe(false)
    })

    it("calls completion callback when all transitions complete", () => {
      const onEnd = jest.fn()
      const manager = new CanvasTransitionManager()

      manager.beginTransition(1000, onEnd)
      manager.setTarget("p1", "x", 0, 100)
      manager.endTransition()

      expect(onEnd).not.toHaveBeenCalled()

      // Advance past duration
      jest.advanceTimersByTime(1000)
      manager.step()

      expect(onEnd).toHaveBeenCalled()
    })

    it("interpolates multiple properties correctly", () => {
      const manager = new CanvasTransitionManager()

      manager.beginTransition(1000)
      manager.setTarget("p1", "x", 0, 100)
      manager.setTarget("p1", "y", 50, 150)
      manager.setTarget("p1", "scale", 0, 1)
      manager.endTransition()

      // Advance to midpoint
      jest.advanceTimersByTime(500)
      const results = manager.step()

      const p1 = results.get("p1")!
      expect(p1.get("x")).toBeCloseTo(50, 0)
      expect(p1.get("y")).toBeCloseTo(100, 0) // 50 + 0.5 * (150 - 50) = 100
      expect(p1.get("scale")).toBeCloseTo(0.5, 1)
    })
  })

  describe("getTargetValue", () => {
    it("returns undefined when no transition", () => {
      const manager = new CanvasTransitionManager()

      expect(manager.getTargetValue("p1", "x")).toBeUndefined()
    })

    it("returns target value for active transition", () => {
      const manager = new CanvasTransitionManager()

      manager.beginTransition(1000)
      manager.setTarget("p1", "x", 0, 100)
      manager.endTransition()

      expect(manager.getTargetValue("p1", "x")).toBe(100)
    })

    it("returns undefined for non-transitioning property", () => {
      const manager = new CanvasTransitionManager()

      manager.beginTransition(1000)
      manager.setTarget("p1", "x", 0, 100)
      manager.endTransition()

      expect(manager.getTargetValue("p1", "y")).toBeUndefined()
    })
  })

  describe("cancelTransitionsForPoint", () => {
    it("removes all transitions for a specific point", () => {
      const manager = new CanvasTransitionManager()

      manager.beginTransition(1000)
      manager.setTarget("p1", "x", 0, 100)
      manager.setTarget("p1", "y", 0, 200)
      manager.setTarget("p2", "x", 0, 100)
      manager.endTransition()

      manager.cancelTransitionsForPoint("p1")

      expect(manager.getTargetValue("p1", "x")).toBeUndefined()
      expect(manager.getTargetValue("p1", "y")).toBeUndefined()
      expect(manager.getTargetValue("p2", "x")).toBe(100) // p2 not affected
    })
  })

  describe("cancelAllTransitions", () => {
    it("removes all active transitions", () => {
      const manager = new CanvasTransitionManager()

      manager.beginTransition(1000)
      manager.setTarget("p1", "x", 0, 100)
      manager.setTarget("p2", "x", 0, 200)
      manager.endTransition()

      expect(manager.hasActiveTransitions()).toBe(true)

      manager.cancelAllTransitions()

      expect(manager.hasActiveTransitions()).toBe(false)
    })
  })
})
