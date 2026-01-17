import { IContextConsumer, webGLContextManager } from "./webgl-context-manager"

// Import the class directly for resetInstance (which is a static method)
// We need to re-import the singleton after reset
const getManager = () => {
  // Reset and get fresh instance for each test
  const WebGLContextManagerModule = require("./webgl-context-manager")
  WebGLContextManagerModule.WebGLContextManager.resetInstance()
  return WebGLContextManagerModule.WebGLContextManager.getInstance()
}

describe("WebGLContextManager", () => {
  let manager: typeof webGLContextManager

  const createConsumer = (
    id: string,
    priority: number,
    onGranted = jest.fn(),
    onRevoked = jest.fn()
  ): IContextConsumer => ({
    id,
    priority,
    onContextGranted: onGranted,
    onContextRevoked: onRevoked
  })

  beforeEach(() => {
    manager = getManager()
  })

  describe("singleton pattern", () => {
    it("returns the same instance on multiple calls", () => {
      const WebGLContextManagerModule = require("./webgl-context-manager")
      const instance1 = WebGLContextManagerModule.WebGLContextManager.getInstance()
      const instance2 = WebGLContextManagerModule.WebGLContextManager.getInstance()
      expect(instance1).toBe(instance2)
    })

    it("resetInstance creates a new instance", () => {
      const WebGLContextManagerModule = require("./webgl-context-manager")
      const instance1 = WebGLContextManagerModule.WebGLContextManager.getInstance()

      // Add a consumer to have some state
      instance1.requestContext(createConsumer("test", 100))
      expect(instance1.activeCount).toBe(1)

      // Reset
      WebGLContextManagerModule.WebGLContextManager.resetInstance()

      const instance2 = WebGLContextManagerModule.WebGLContextManager.getInstance()
      expect(instance2).not.toBe(instance1)
      expect(instance2.activeCount).toBe(0)
    })
  })

  describe("maxContexts", () => {
    it("has max contexts set to 14", () => {
      expect(manager.maxContexts).toBe(14)
    })
  })

  describe("initial state", () => {
    it("starts with no active contexts", () => {
      expect(manager.activeCount).toBe(0)
    })

    it("starts with no waiting consumers", () => {
      expect(manager.waitingCount).toBe(0)
    })
  })

  describe("requestContext", () => {
    it("grants context immediately when pool has room", () => {
      const onGranted = jest.fn()
      const consumer = createConsumer("consumer1", 100, onGranted)

      const granted = manager.requestContext(consumer)

      expect(granted).toBe(true)
      expect(onGranted).toHaveBeenCalled()
      expect(manager.activeCount).toBe(1)
    })

    it("returns true for already-active consumer", () => {
      const consumer = createConsumer("consumer1", 100)
      manager.requestContext(consumer)

      const grantedAgain = manager.requestContext(consumer)

      expect(grantedAgain).toBe(true)
      expect(manager.activeCount).toBe(1)
    })

    it("grants up to maxContexts consumers", () => {
      for (let i = 0; i < manager.maxContexts; i++) {
        const consumer = createConsumer(`consumer${i}`, 100)
        const granted = manager.requestContext(consumer)
        expect(granted).toBe(true)
      }

      expect(manager.activeCount).toBe(manager.maxContexts)
    })

    it("denies context when pool is full and priority is too low", () => {
      // Fill pool with high-priority consumers
      for (let i = 0; i < manager.maxContexts; i++) {
        manager.requestContext(createConsumer(`consumer${i}`, 1000))
      }

      // Try to request with low priority
      const onGranted = jest.fn()
      const lowPriorityConsumer = createConsumer("lowPriority", 10, onGranted)
      const granted = manager.requestContext(lowPriorityConsumer)

      expect(granted).toBe(false)
      expect(onGranted).not.toHaveBeenCalled()
    })

    it("evicts lowest-priority consumer when higher-priority requests", () => {
      // Fill pool
      const consumers: IContextConsumer[] = []
      const revokedCallbacks: jest.Mock[] = []

      for (let i = 0; i < manager.maxContexts; i++) {
        const onRevoked = jest.fn()
        revokedCallbacks.push(onRevoked)
        const consumer = createConsumer(`consumer${i}`, (i + 1) * 100, jest.fn(), onRevoked)
        consumers.push(consumer)
        manager.requestContext(consumer)
      }

      // Request with very high priority
      const highPriorityGranted = jest.fn()
      const highPriorityConsumer = createConsumer("highPriority", 10000, highPriorityGranted)
      const granted = manager.requestContext(highPriorityConsumer)

      expect(granted).toBe(true)
      expect(highPriorityGranted).toHaveBeenCalled()
      // Lowest priority consumer (priority 100) should have been revoked
      expect(revokedCallbacks[0]).toHaveBeenCalled()
    })
  })

  describe("hasContext", () => {
    it("returns true for active consumer", () => {
      const consumer = createConsumer("consumer1", 100)
      manager.requestContext(consumer)

      expect(manager.hasContext("consumer1")).toBe(true)
    })

    it("returns false for non-existent consumer", () => {
      expect(manager.hasContext("nonexistent")).toBe(false)
    })

    it("returns false for waiting consumer", () => {
      // Fill pool
      for (let i = 0; i < manager.maxContexts; i++) {
        manager.requestContext(createConsumer(`consumer${i}`, 1000))
      }

      // Add waiting consumer (low priority, won't evict)
      manager.requestContext(createConsumer("waiting", 1))

      expect(manager.hasContext("waiting")).toBe(false)
    })
  })

  describe("releaseContext", () => {
    it("removes consumer from active set", () => {
      const consumer = createConsumer("consumer1", 100)
      manager.requestContext(consumer)
      expect(manager.hasContext("consumer1")).toBe(true)

      manager.releaseContext("consumer1")

      expect(manager.hasContext("consumer1")).toBe(false)
      expect(manager.activeCount).toBe(0)
    })

    it("grants context to highest-priority waiting consumer", () => {
      // Fill pool
      for (let i = 0; i < manager.maxContexts; i++) {
        manager.requestContext(createConsumer(`consumer${i}`, 100))
      }

      // Add waiting consumers with different priorities
      const highPriorityGranted = jest.fn()
      const lowPriorityGranted = jest.fn()
      manager.requestContext(createConsumer("waiting-low", 50, lowPriorityGranted))
      manager.requestContext(createConsumer("waiting-high", 200, highPriorityGranted))

      // Release one active consumer
      manager.releaseContext("consumer0")

      // Higher priority waiting consumer should get the context
      expect(highPriorityGranted).toHaveBeenCalled()
      expect(lowPriorityGranted).not.toHaveBeenCalled()
      expect(manager.hasContext("waiting-high")).toBe(true)
    })

    it("handles release of non-existent consumer gracefully", () => {
      expect(() => manager.releaseContext("nonexistent")).not.toThrow()
    })
  })

  describe("yieldContext", () => {
    it("releases context but keeps consumer registered", () => {
      const onRevoked = jest.fn()
      const consumer = createConsumer("consumer1", 100, jest.fn(), onRevoked)
      manager.requestContext(consumer)

      manager.yieldContext("consumer1")

      expect(manager.hasContext("consumer1")).toBe(false)
      expect(onRevoked).toHaveBeenCalled()
    })

    it("does not re-grant to yielded consumer automatically", () => {
      // Add and yield a consumer
      const onGranted = jest.fn()
      const consumer = createConsumer("consumer1", 1000, onGranted)
      manager.requestContext(consumer)
      onGranted.mockClear()

      manager.yieldContext("consumer1")

      // Add another consumer - should get context, not the yielded one
      const otherConsumer = createConsumer("consumer2", 500)
      manager.requestContext(otherConsumer)

      expect(manager.hasContext("consumer2")).toBe(true)
      expect(onGranted).not.toHaveBeenCalled()
    })

    it("grants to waiting consumer when yielded", () => {
      // Fill pool
      for (let i = 0; i < manager.maxContexts; i++) {
        manager.requestContext(createConsumer(`consumer${i}`, 100))
      }

      // Add waiting consumer
      const waitingGranted = jest.fn()
      manager.requestContext(createConsumer("waiting", 50, waitingGranted))
      expect(waitingGranted).not.toHaveBeenCalled()

      // Yield one consumer
      manager.yieldContext("consumer0")

      // Waiting consumer should now have context
      expect(waitingGranted).toHaveBeenCalled()
      expect(manager.hasContext("waiting")).toBe(true)
    })

    it("handles yield of non-active consumer gracefully", () => {
      expect(() => manager.yieldContext("nonexistent")).not.toThrow()
    })
  })

  describe("updatePriority", () => {
    it("updates consumer priority", () => {
      // Fill pool with high-priority consumers
      for (let i = 0; i < manager.maxContexts; i++) {
        manager.requestContext(createConsumer(`consumer${i}`, 1000))
      }

      // Add low-priority waiting consumer
      const waitingGranted = jest.fn()
      manager.requestContext(createConsumer("waiting", 1, waitingGranted))
      expect(waitingGranted).not.toHaveBeenCalled()

      // Update priority to very high
      manager.updatePriority("waiting", 5000)

      // Should have evicted lowest and granted to waiting
      expect(waitingGranted).toHaveBeenCalled()
      expect(manager.hasContext("waiting")).toBe(true)
    })

    it("handles non-existent consumer gracefully", () => {
      expect(() => manager.updatePriority("nonexistent", 1000)).not.toThrow()
    })

    it("does not trigger eviction for yielded consumers when priority updated", () => {
      // Add and yield a high-priority consumer
      const consumer = createConsumer("yielded", 10000)
      manager.requestContext(consumer)
      manager.yieldContext("yielded")

      // Fill pool
      for (let i = 0; i < manager.maxContexts; i++) {
        manager.requestContext(createConsumer(`consumer${i}`, 100))
      }

      // Update yielded consumer's priority - should not cause eviction since it's yielded
      const onGranted = jest.fn()
      consumer.onContextGranted = onGranted
      manager.updatePriority("yielded", 50000)

      // Yielded consumer should not have been granted context
      expect(onGranted).not.toHaveBeenCalled()
      expect(manager.hasContext("yielded")).toBe(false)
    })
  })

  describe("reRequestContext", () => {
    it("grants context to previously yielded consumer", () => {
      const onGranted = jest.fn()
      const consumer = createConsumer("consumer1", 100, onGranted)
      manager.requestContext(consumer)
      onGranted.mockClear()

      manager.yieldContext("consumer1")
      expect(manager.hasContext("consumer1")).toBe(false)

      const granted = manager.reRequestContext("consumer1")

      expect(granted).toBe(true)
      expect(onGranted).toHaveBeenCalled()
      expect(manager.hasContext("consumer1")).toBe(true)
    })

    it("returns true for already-active consumer", () => {
      const consumer = createConsumer("consumer1", 100)
      manager.requestContext(consumer)

      const granted = manager.reRequestContext("consumer1")

      expect(granted).toBe(true)
    })

    it("returns false for non-existent consumer", () => {
      const granted = manager.reRequestContext("nonexistent")
      expect(granted).toBe(false)
    })

    it("tries to evict lower-priority consumer when re-requesting", () => {
      // Fill pool with medium-priority consumers
      for (let i = 0; i < manager.maxContexts; i++) {
        manager.requestContext(createConsumer(`consumer${i}`, 500))
      }

      // Add and yield high-priority consumer
      const onGranted = jest.fn()
      const highPriority = createConsumer("highPriority", 1000, onGranted)
      manager.requestContext(highPriority) // will evict a lower priority
      onGranted.mockClear()
      manager.yieldContext("highPriority")

      // Re-request - should evict lowest priority
      const granted = manager.reRequestContext("highPriority")

      expect(granted).toBe(true)
      expect(onGranted).toHaveBeenCalled()
    })
  })

  describe("getNextUserInteractionPriority", () => {
    it("returns incrementing values", () => {
      const p1 = manager.getNextUserInteractionPriority()
      const p2 = manager.getNextUserInteractionPriority()
      const p3 = manager.getNextUserInteractionPriority()

      expect(p2).toBeGreaterThan(p1)
      expect(p3).toBeGreaterThan(p2)
    })

    it("returns values greater than 1 billion", () => {
      const priority = manager.getNextUserInteractionPriority()
      expect(priority).toBeGreaterThan(1_000_000_000)
    })
  })

  describe("waitingCount", () => {
    it("counts waiting consumers correctly", () => {
      // Fill pool
      for (let i = 0; i < manager.maxContexts; i++) {
        manager.requestContext(createConsumer(`consumer${i}`, 1000))
      }

      expect(manager.waitingCount).toBe(0)

      // Add waiting consumers (low priority, won't evict)
      manager.requestContext(createConsumer("waiting1", 1))
      manager.requestContext(createConsumer("waiting2", 2))

      expect(manager.waitingCount).toBe(2)
    })

    it("excludes yielded consumers from waiting count", () => {
      // Add and yield a consumer
      manager.requestContext(createConsumer("consumer1", 100))
      manager.yieldContext("consumer1")

      // Yielded consumers shouldn't be counted as waiting
      expect(manager.waitingCount).toBe(0)
    })
  })

  describe("priority-based eviction", () => {
    it("evicts consumer with lowest priority", () => {
      const revokedCallbacks: Record<string, jest.Mock> = {}

      // Add consumers with varying priorities
      const priorities = [500, 100, 800, 300, 200]
      for (let i = 0; i < manager.maxContexts; i++) {
        const priority = priorities[i] || 400
        revokedCallbacks[`consumer${i}`] = jest.fn()
        manager.requestContext(createConsumer(
          `consumer${i}`,
          priority,
          jest.fn(),
          revokedCallbacks[`consumer${i}`]
        ))
      }

      // Request with high priority - should evict consumer1 (priority 100)
      manager.requestContext(createConsumer("highPriority", 5000))

      expect(revokedCallbacks["consumer1"]).toHaveBeenCalled()
      expect(manager.hasContext("consumer1")).toBe(false)
      expect(manager.hasContext("highPriority")).toBe(true)
    })

    it("does not evict if no consumer has lower priority", () => {
      // Fill with high-priority consumers
      for (let i = 0; i < manager.maxContexts; i++) {
        manager.requestContext(createConsumer(`consumer${i}`, 1000))
      }

      // Try to request with same priority - should not evict
      const onGranted = jest.fn()
      const granted = manager.requestContext(createConsumer("samePriority", 1000, onGranted))

      expect(granted).toBe(false)
      expect(onGranted).not.toHaveBeenCalled()
    })
  })

  describe("complex scenarios", () => {
    it("handles rapid request/yield/release cycles", () => {
      const consumer = createConsumer("consumer1", 100)

      manager.requestContext(consumer)
      expect(manager.hasContext("consumer1")).toBe(true)

      manager.yieldContext("consumer1")
      expect(manager.hasContext("consumer1")).toBe(false)

      manager.reRequestContext("consumer1")
      expect(manager.hasContext("consumer1")).toBe(true)

      manager.releaseContext("consumer1")
      expect(manager.hasContext("consumer1")).toBe(false)

      // Re-adding after release should work
      manager.requestContext(consumer)
      expect(manager.hasContext("consumer1")).toBe(true)
    })

    it("maintains correct counts through various operations", () => {
      // Add 3 consumers
      manager.requestContext(createConsumer("c1", 100))
      manager.requestContext(createConsumer("c2", 200))
      manager.requestContext(createConsumer("c3", 300))

      expect(manager.activeCount).toBe(3)
      expect(manager.waitingCount).toBe(0)

      // Yield one
      manager.yieldContext("c1")
      expect(manager.activeCount).toBe(2)
      expect(manager.waitingCount).toBe(0)

      // Release one
      manager.releaseContext("c2")
      expect(manager.activeCount).toBe(1)
      expect(manager.waitingCount).toBe(0)

      // Re-request yielded
      manager.reRequestContext("c1")
      expect(manager.activeCount).toBe(2)
    })
  })
})
