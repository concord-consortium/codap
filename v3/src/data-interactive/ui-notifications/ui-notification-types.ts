export type UiRegion = "header" | "workspace" | "overlay"

export const kSubscribableEventTypes = [
  "appear",
  "disappear",
  "click",
  "dblclick",
  "dragStart",
  "dragEnd",
  "layoutChange",
  "dialogChange"
] as const

export type UiSubscribableEventType = typeof kSubscribableEventTypes[number]
export type UiEventType = UiSubscribableEventType | "rateLimited"

export interface UiNotificationFilter {
  eventTypes?: UiSubscribableEventType[]
  targets?: string[]
}

export interface UiTarget {
  tourKey?: string
  testId?: string
  componentId?: string
  label?: string
  tag?: string
  disabled?: boolean
  interactionKind?: string
}

export interface UiDragId {
  source: string
  over?: string
}

export interface UiDialogChangeTarget {
  testId?: string
  title?: string
}

export type UiDialogChange =
  | { kind: "label"; before: string; after: string }
  | { kind: "attribute"; name: string; before: string | null; after: string | null }
  | { kind: "value"; before: string; after: string }

export interface UiNoticeBase {
  eventType: UiEventType
  region?: UiRegion
  target?: UiTarget
  monitor: { id: number; clientId?: string }
}

export interface UiAppearDisappearNotice extends UiNoticeBase {
  eventType: "appear" | "disappear"
  region: UiRegion
  target: UiTarget
}

export interface UiClickNotice extends UiNoticeBase {
  eventType: "click" | "dblclick"
  region: UiRegion
  target: UiTarget
  via?: "keyboard" | "pointer"
  key?: string
}

export interface UiDragNotice extends UiNoticeBase {
  eventType: "dragStart" | "dragEnd"
  region: UiRegion
  target: UiTarget
  dragId: UiDragId
  cancelled?: boolean
}

export interface UiLayoutChangeNotice extends UiNoticeBase {
  eventType: "layoutChange"
  region: UiRegion
  setting: string
  value: unknown
  previousValue: unknown
  target?: UiTarget
}

export interface UiDialogChangeNotice extends UiNoticeBase {
  eventType: "dialogChange"
  region: UiRegion
  dialogTarget: UiDialogChangeTarget
  control: { testId?: string; tag?: string }
  change: UiDialogChange
}

export interface UiRateLimitedNotice extends UiNoticeBase {
  eventType: "rateLimited"
  monitor: { id: number; clientId?: string }
  droppedCount: number
  windowMs: number
}

export type UiNotice =
  | UiAppearDisappearNotice
  | UiClickNotice
  | UiDragNotice
  | UiLayoutChangeNotice
  | UiDialogChangeNotice
  | UiRateLimitedNotice

export type CompiledPattern =
  | { kind: "exact"; value: string }
  | { kind: "prefix"; value: string }

export interface CompiledFilter {
  eventTypes?: Set<UiSubscribableEventType>
  targets?: CompiledPattern[]
}

export interface UiMonitor {
  id: number
  clientId?: string
  ownerTileId: string
  filter: UiNotificationFilter
  compiled: CompiledFilter
}

export interface FilterValidationResult {
  ok: boolean
  error?: string
}
