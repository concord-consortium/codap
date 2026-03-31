import { HighlightRequestValues, TourRequestValues, TourStepInput } from "./tour-manager"

function pickString(val: unknown): string | undefined {
  return typeof val === "string" ? val : undefined
}

function pickNumber(val: unknown): number | undefined {
  return typeof val === "number" ? val : undefined
}

function pickBoolean(val: unknown): boolean | undefined {
  return typeof val === "boolean" ? val : undefined
}

function pickStringArray<T extends string>(val: unknown, allowed: readonly T[]): T[] | undefined {
  if (!Array.isArray(val)) return undefined
  const allowedStrings = allowed as readonly string[]
  const filtered = val.filter((v: unknown): v is T => typeof v === "string" && allowedStrings.includes(v))
  return filtered
}

function stripHtml(val: unknown): string | undefined {
  const str = pickString(val)
  if (str == null) return undefined
  return str.replace(/<[^>]*>/g, "")
}

const validSides = ["top", "right", "bottom", "left"]
const validAligns = ["start", "center", "end"]

function sanitizeStepInput(raw: unknown): TourStepInput | null {
  if (typeof raw !== "object" || raw == null) return null
  const v = raw as Record<string, unknown>
  const popoverRaw = v.popover != null && typeof v.popover === "object"
    ? v.popover as Record<string, unknown>
    : null
  const side = pickString(popoverRaw?.side)
  const align = pickString(popoverRaw?.align)
  return {
    ...(v.tourKey != null && { tourKey: pickString(v.tourKey) }),
    ...(v.testId != null && { testId: pickString(v.testId) }),
    ...(v.selector != null && { selector: pickString(v.selector) }),
    ...(v.component != null && { component: pickString(v.component) }),
    ...(v.id != null && { id: pickString(v.id) }),
    ...(v.disableActiveInteraction != null && { disableActiveInteraction: pickBoolean(v.disableActiveInteraction) }),
    ...(v.stagePadding != null && { stagePadding: pickNumber(v.stagePadding) }),
    ...(v.stageRadius != null && { stageRadius: pickNumber(v.stageRadius) }),
    ...(popoverRaw && {
      popover: {
        title: stripHtml(popoverRaw.title),
        description: stripHtml(popoverRaw.description),
        ...(side && validSides.includes(side) && { side }),
        ...(align && validAligns.includes(align) && { align }),
      }
    }),
  }
}

export function sanitizeHighlightValues(raw: Record<string, unknown>): HighlightRequestValues {
  const step = sanitizeStepInput(raw) ?? {}
  return {
    ...step,
    ...(raw.overlayColor != null && { overlayColor: pickString(raw.overlayColor) }),
    ...(raw.overlayOpacity != null && { overlayOpacity: pickNumber(raw.overlayOpacity) }),
  }
}

const buttonNames = ["next", "previous", "close"] as const

export function sanitizeTourValues(raw: Record<string, unknown>): TourRequestValues {
  const rawSteps = Array.isArray(raw.steps) ? raw.steps : []
  const steps = rawSteps.map(sanitizeStepInput).filter((s): s is TourStepInput => s != null)
  return {
    steps,
    ...(raw.overlayColor != null && { overlayColor: pickString(raw.overlayColor) }),
    ...(raw.overlayOpacity != null && { overlayOpacity: pickNumber(raw.overlayOpacity) }),
    ...(raw.stagePadding != null && { stagePadding: pickNumber(raw.stagePadding) }),
    ...(raw.stageRadius != null && { stageRadius: pickNumber(raw.stageRadius) }),
    ...(raw.showButtons != null && { showButtons: pickStringArray(raw.showButtons, buttonNames) }),
    ...(raw.disableButtons != null && { disableButtons: pickStringArray(raw.disableButtons, buttonNames) }),
    ...(raw.showProgress != null && { showProgress: pickBoolean(raw.showProgress) }),
    ...(raw.allowKeyboardControl != null && { allowKeyboardControl: pickBoolean(raw.allowKeyboardControl) }),
    ...(raw.allowClose != null && { allowClose: pickBoolean(raw.allowClose) }),
    ...(raw.disableActiveInteraction != null &&
      { disableActiveInteraction: pickBoolean(raw.disableActiveInteraction) }),
    ...(raw.animate != null && { animate: pickBoolean(raw.animate) }),
    ...(raw.smoothScroll != null && { smoothScroll: pickBoolean(raw.smoothScroll) }),
    ...(raw.popoverOffset != null && { popoverOffset: pickNumber(raw.popoverOffset) }),
    ...(raw.progressText != null && { progressText: pickString(raw.progressText) }),
    ...(raw.nextBtnText != null && { nextBtnText: pickString(raw.nextBtnText) }),
    ...(raw.prevBtnText != null && { prevBtnText: pickString(raw.prevBtnText) }),
    ...(raw.doneBtnText != null && { doneBtnText: pickString(raw.doneBtnText) }),
  }
}

export { pickString, pickNumber }
