import {
  CompiledFilter, CompiledPattern, FilterValidationResult, kSubscribableEventTypes, UiMonitor, UiNotice,
  UiNotificationFilter, UiTarget
} from "./ui-notification-types"

const kValidEventTypes = new Set<string>(kSubscribableEventTypes)

export function validateFilter(filter: unknown): FilterValidationResult {
  if (filter == null || typeof filter !== "object") {
    return { ok: false, error: "filter must be an object" }
  }
  const f = filter as UiNotificationFilter
  if (f.eventTypes !== undefined) {
    if (!Array.isArray(f.eventTypes)) return { ok: false, error: "eventTypes must be an array" }
    if (f.eventTypes.length === 0) return { ok: false, error: "eventTypes must not be empty" }
    for (const et of f.eventTypes) {
      if (typeof et !== "string") return { ok: false, error: "eventTypes entries must be strings" }
      if ((et as string) === "rateLimited") {
        return { ok: false, error: "rateLimited is not subscribable; it is delivered automatically" }
      }
      if (!kValidEventTypes.has(et as string)) return { ok: false, error: `unknown event type: ${et}` }
    }
  }
  if (f.targets !== undefined) {
    if (!Array.isArray(f.targets)) return { ok: false, error: "targets must be an array" }
    if (f.targets.length === 0) return { ok: false, error: "targets must not be empty" }
    for (const t of f.targets) {
      if (typeof t !== "string") return { ok: false, error: "targets entries must be strings" }
      if (t.length === 0) return { ok: false, error: "targets entries must not be empty" }
      const starIdx = t.indexOf("*")
      if (starIdx !== -1 && starIdx !== t.length - 1) {
        return { ok: false, error: `glob '*' only allowed as trailing character: ${t}` }
      }
    }
  }
  return { ok: true }
}

export function compileFilter(filter: UiNotificationFilter): CompiledFilter {
  const compiled: CompiledFilter = {}
  if (filter.eventTypes) {
    compiled.eventTypes = new Set(filter.eventTypes)
  }
  if (filter.targets) {
    compiled.targets = filter.targets.map<CompiledPattern>(p => {
      if (p.endsWith("*")) return { kind: "prefix", value: p.slice(0, -1) }
      return { kind: "exact", value: p }
    })
  }
  return compiled
}

export function matchesPattern(pattern: CompiledPattern, candidate: string | undefined): boolean {
  if (candidate == null) return false
  if (pattern.kind === "exact") return candidate === pattern.value
  return candidate.startsWith(pattern.value)
}

export function matchesTarget(patterns: CompiledPattern[] | undefined, target: UiTarget | undefined): boolean {
  if (!patterns) return true
  if (!target) return false
  for (const p of patterns) {
    if (matchesPattern(p, target.tourKey) || matchesPattern(p, target.testId)) return true
  }
  return false
}

export function matchesDialogChangeTargets(
  patterns: CompiledPattern[] | undefined,
  dialogTestId: string | undefined,
  controlTestId: string | undefined
): boolean {
  if (!patterns) return true
  for (const p of patterns) {
    if (matchesPattern(p, dialogTestId) || matchesPattern(p, controlTestId)) return true
  }
  return false
}

export function matchesMonitor(monitor: UiMonitor, notice: UiNotice): boolean {
  if (notice.eventType === "rateLimited") return monitor.id === notice.monitor.id
  const { compiled } = monitor
  if (compiled.eventTypes && !compiled.eventTypes.has(notice.eventType)) return false
  if (notice.eventType === "dialogChange") {
    return matchesDialogChangeTargets(compiled.targets, notice.dialogTarget?.testId, notice.control?.testId)
  }
  return matchesTarget(compiled.targets, notice.target)
}
