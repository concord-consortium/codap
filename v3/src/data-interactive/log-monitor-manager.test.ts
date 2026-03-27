import { LogMonitorManager } from "./log-monitor-manager"

describe("LogMonitorManager", () => {
  let manager: LogMonitorManager

  beforeEach(() => {
    manager = new LogMonitorManager()
  })

  describe("registration", () => {
    it("registers a monitor and returns incrementing IDs", () => {
      const m1 = manager.register("plugin-1", { message: "*" })
      const m2 = manager.register("plugin-1", { topic: "myTopic" })
      expect(m1.id).toBe(1)
      expect(m2.id).toBe(2)
      expect(m1.clientId).toBe("plugin-1")
    })

    it("unregisters by monitor ID", () => {
      const m1 = manager.register("plugin-1", { message: "*" })
      expect(manager.unregister(m1.id)).toBe(true)
      expect(manager.unregister(m1.id)).toBe(false) // already removed
    })

    it("unregisters all monitors for a clientId", () => {
      manager.register("plugin-1", { message: "*" })
      manager.register("plugin-1", { topic: "a" })
      manager.register("plugin-2", { message: "*" })

      manager.unregisterByClientId("plugin-1")

      // plugin-1 monitors removed, plugin-2 still active
      const matches = manager.evaluateLogEvent({ message: "test", formatStr: "test" })
      expect(matches).toHaveLength(1)
      expect(matches[0].clientId).toBe("plugin-2")
    })

    it("unregisters all monitors", () => {
      manager.register("plugin-1", { message: "*" })
      manager.register("plugin-2", { message: "*" })

      manager.unregisterAll()

      const matches = manager.evaluateLogEvent({ message: "test", formatStr: "test" })
      expect(matches).toHaveLength(0)
    })
  })

  describe("filter matching", () => {
    it("matches message wildcard '*'", () => {
      manager.register("plugin-1", { message: "*" })
      const matches = manager.evaluateLogEvent({ message: "anything", formatStr: "anything" })
      expect(matches).toHaveLength(1)
    })

    it("matches exact message", () => {
      manager.register("plugin-1", { message: "specific event" })
      expect(manager.evaluateLogEvent({ message: "specific event", formatStr: "test" })).toHaveLength(1)
      expect(manager.evaluateLogEvent({ message: "other event", formatStr: "test" })).toHaveLength(0)
    })

    it("matches exact topic", () => {
      manager.register("plugin-1", { topic: "myTopic" })
      expect(manager.evaluateLogEvent({ message: "test", formatStr: "test", topic: "myTopic" })).toHaveLength(1)
      expect(manager.evaluateLogEvent({ message: "test", formatStr: "test", topic: "other" })).toHaveLength(0)
      expect(manager.evaluateLogEvent({ message: "test", formatStr: "test" })).toHaveLength(0)
    })

    it("matches topicPrefix", () => {
      manager.register("plugin-1", { topicPrefix: "game." })
      expect(manager.evaluateLogEvent({ message: "test", formatStr: "test", topic: "game.start" })).toHaveLength(1)
      expect(manager.evaluateLogEvent({ message: "test", formatStr: "test", topic: "game." })).toHaveLength(1)
      expect(manager.evaluateLogEvent({ message: "test", formatStr: "test", topic: "other" })).toHaveLength(0)
    })

    it("matches exact formatStr", () => {
      manager.register("plugin-1", { formatStr: "caseSelected: %@" })
      expect(manager.evaluateLogEvent({ message: "caseSelected: 5", formatStr: "caseSelected: %@" })).toHaveLength(1)
      expect(manager.evaluateLogEvent({ message: "test", formatStr: "other" })).toHaveLength(0)
    })

    it("matches formatPrefix", () => {
      manager.register("plugin-1", { formatPrefix: "case" })
      expect(manager.evaluateLogEvent({ message: "test", formatStr: "caseSelected: %@" })).toHaveLength(1)
      expect(manager.evaluateLogEvent({ message: "test", formatStr: "sliderEdit" })).toHaveLength(0)
    })

    it("ANDs multiple filters on one monitor", () => {
      manager.register("plugin-1", { topic: "game", message: "start" })
      // both match
      expect(manager.evaluateLogEvent({ message: "start", formatStr: "start", topic: "game" })).toHaveLength(1)
      // topic matches but message doesn't
      expect(manager.evaluateLogEvent({ message: "stop", formatStr: "stop", topic: "game" })).toHaveLength(0)
      // message matches but topic doesn't
      expect(manager.evaluateLogEvent({ message: "start", formatStr: "start", topic: "other" })).toHaveLength(0)
    })

    it("returns empty array when no monitors match", () => {
      manager.register("plugin-1", { topic: "specific" })
      expect(manager.evaluateLogEvent({ message: "test", formatStr: "test" })).toHaveLength(0)
    })
  })
})
