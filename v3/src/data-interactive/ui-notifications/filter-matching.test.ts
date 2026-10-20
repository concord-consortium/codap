import {
  compileFilter, matchesDialogChangeTargets, matchesMonitor, matchesTarget, validateFilter
} from "./filter-matching"
import { UiMonitor, UiNotice } from "./ui-notification-types"

describe("validateFilter", () => {
  it("accepts empty filter (no fields)", () => {
    expect(validateFilter({}).ok).toBe(true)
  })

  it("rejects non-object filter", () => {
    expect(validateFilter(null).ok).toBe(false)
    expect(validateFilter(42 as unknown).ok).toBe(false)
  })

  it("rejects empty eventTypes array", () => {
    const r = validateFilter({ eventTypes: [] })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/eventTypes/)
  })

  it("rejects empty targets array", () => {
    const r = validateFilter({ targets: [] })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/targets/)
  })

  it("rejects unknown event types", () => {
    const r = validateFilter({ eventTypes: ["zoom"] })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/unknown/)
  })

  it("rejects rateLimited in eventTypes", () => {
    const r = validateFilter({ eventTypes: ["rateLimited"] })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/rateLimited/)
  })

  it("accepts valid event types", () => {
    expect(validateFilter({
      eventTypes: ["appear", "disappear", "click", "dblclick", "dragStart", "dragEnd", "layoutChange", "dialogChange"]
    }).ok).toBe(true)
  })

  it("rejects mid-string '*' in target pattern", () => {
    const r = validateFilter({ targets: ["foo*bar"] })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/trailing/)
  })

  it("accepts trailing '*' glob", () => {
    expect(validateFilter({ targets: ["toolShelf.*", "axis-legend-*", "exact"] }).ok).toBe(true)
  })

  it("rejects empty-string target pattern", () => {
    expect(validateFilter({ targets: [""] }).ok).toBe(false)
  })

  it("rejects non-string targets entries", () => {
    expect(validateFilter({ targets: [123] }).ok).toBe(false)
  })
})

describe("matchesTarget", () => {
  it("returns true when patterns is undefined (vacuous)", () => {
    expect(matchesTarget(undefined, { testId: "whatever" })).toBe(true)
  })

  it("matches exact testId", () => {
    const patterns = compileFilter({ targets: ["foo.bar"] }).targets
    expect(matchesTarget(patterns, { testId: "foo.bar" })).toBe(true)
    expect(matchesTarget(patterns, { testId: "foo.baz" })).toBe(false)
  })

  it("matches exact tourKey", () => {
    const patterns = compileFilter({ targets: ["menuBar.fileMenu"] }).targets
    expect(matchesTarget(patterns, { tourKey: "menuBar.fileMenu" })).toBe(true)
  })

  it("prefix-matches trailing '*'", () => {
    const patterns = compileFilter({ targets: ["axis-legend-*"] }).targets
    expect(matchesTarget(patterns, { testId: "axis-legend-attribute-button-bottom" })).toBe(true)
    expect(matchesTarget(patterns, { testId: "axis-other" })).toBe(false)
  })

  it("is case-sensitive", () => {
    const patterns = compileFilter({ targets: ["Foo"] }).targets
    expect(matchesTarget(patterns, { testId: "foo" })).toBe(false)
    expect(matchesTarget(patterns, { testId: "Foo" })).toBe(true)
  })

  it("treats dots and hyphens as literal characters", () => {
    const patterns = compileFilter({ targets: ["menu-bar.file"] }).targets
    expect(matchesTarget(patterns, { testId: "menu-bar.file" })).toBe(true)
    expect(matchesTarget(patterns, { testId: "menu-barXfile" })).toBe(false)
  })

  it("does NOT match componentId or label or tag (match surface = testId/tourKey only)", () => {
    const patterns = compileFilter({ targets: ["GRPH44"] }).targets
    expect(matchesTarget(patterns, { componentId: "GRPH44" })).toBe(false)
    expect(matchesTarget(patterns, { label: "GRPH44" })).toBe(false)
    expect(matchesTarget(patterns, { tag: "GRPH44" })).toBe(false)
  })

  it("ORs within the targets array", () => {
    const patterns = compileFilter({ targets: ["a", "b"] }).targets
    expect(matchesTarget(patterns, { testId: "a" })).toBe(true)
    expect(matchesTarget(patterns, { testId: "b" })).toBe(true)
    expect(matchesTarget(patterns, { testId: "c" })).toBe(false)
  })
})

describe("matchesMonitor", () => {
  function monitor(filter: { eventTypes?: string[]; targets?: string[] }): UiMonitor {
    const compiled = compileFilter(filter as never)
    return {
      id: 1,
      ownerTileId: "tile",
      filter: filter as never,
      compiled
    }
  }

  it("ANDs eventTypes and targets", () => {
    const m = monitor({ eventTypes: ["click"], targets: ["foo"] })
    const click: UiNotice = {
      eventType: "click", region: "header", target: { testId: "foo" }, monitor: { id: 1 }
    }
    expect(matchesMonitor(m, click)).toBe(true)
    const wrongEvent: UiNotice = {
      eventType: "appear", region: "header", target: { testId: "foo" }, monitor: { id: 1 }
    }
    expect(matchesMonitor(m, wrongEvent)).toBe(false)
    const wrongTarget: UiNotice = {
      eventType: "click", region: "header", target: { testId: "bar" }, monitor: { id: 1 }
    }
    expect(matchesMonitor(m, wrongTarget)).toBe(false)
  })

  it("delivers rateLimited notices only to the owning monitor", () => {
    const m = monitor({ eventTypes: ["click"] })
    const rl: UiNotice = {
      eventType: "rateLimited",
      monitor: { id: 1 },
      droppedCount: 5,
      windowMs: 1000
    }
    expect(matchesMonitor(m, rl)).toBe(true)
    const rlOther: UiNotice = {
      eventType: "rateLimited",
      monitor: { id: 999 },
      droppedCount: 5,
      windowMs: 1000
    }
    expect(matchesMonitor(m, rlOther)).toBe(false)
  })

  it("delivers all event types when eventTypes omitted", () => {
    const m = monitor({ targets: ["foo"] })
    const click: UiNotice = {
      eventType: "click", region: "header", target: { testId: "foo" }, monitor: { id: 1 }
    }
    const appear: UiNotice = {
      eventType: "appear", region: "header", target: { testId: "foo" }, monitor: { id: 1 }
    }
    expect(matchesMonitor(m, click)).toBe(true)
    expect(matchesMonitor(m, appear)).toBe(true)
  })

  it("matches dialogChange on dialogTarget.testId OR control.testId", () => {
    const m = monitor({ eventTypes: ["dialogChange"], targets: ["cfm-dialog-share"] })
    const dc: UiNotice = {
      eventType: "dialogChange",
      region: "header",
      dialogTarget: { testId: "cfm-dialog-share" },
      control: { testId: "cfm-dialog-share-enable-button" },
      change: { kind: "attribute", name: "disabled", before: "true", after: "false" },
      monitor: { id: 1 }
    }
    expect(matchesMonitor(m, dc)).toBe(true)

    const m2 = monitor({ eventTypes: ["dialogChange"], targets: ["cfm-dialog-share-copy-button"] })
    expect(matchesMonitor(m2, dc)).toBe(false)
    const dc2: UiNotice = { ...dc, control: { testId: "cfm-dialog-share-copy-button" } } as UiNotice
    expect(matchesMonitor(m2, dc2)).toBe(true)
  })
})

describe("matchesDialogChangeTargets", () => {
  it("returns true when patterns undefined", () => {
    expect(matchesDialogChangeTargets(undefined, "a", "b")).toBe(true)
  })

  it("matches against dialogTarget or controlTestId", () => {
    const patterns = compileFilter({ targets: ["cfm-dialog-share-*"] }).targets
    expect(matchesDialogChangeTargets(patterns, "unrelated", "cfm-dialog-share-enable-button")).toBe(true)
    expect(matchesDialogChangeTargets(patterns, "cfm-dialog-share-something", "unrelated")).toBe(true)
    expect(matchesDialogChangeTargets(patterns, "unrelated", "unrelated")).toBe(false)
  })
})
