import { tourElements } from "../../lib/tour/tour-elements"
import { UiRegion, UiTarget } from "./ui-notification-types"

export const kMarkerClasses = [
  ".chakra-menu__menu-list",
  ".chakra-modal__content",
  ".chakra-modal__overlay",
  ".menu-list-container",
  ".inspector-menu-list",
  ".inspector-menu-popover",
  ".axis-legend-menu",
  ".tool-shelf-menu-list",
  ".codap-inspector-palette",
  ".modal-dialog-container",
  ".confirm-dialog",
  ".alert-dialog"
] as const

export const kRoleSelectors = [
  '[role="menu"]',
  '[role="menuitem"]',
  '[role="dialog"]'
] as const

export const kOverlayMarkers = [
  ".chakra-menu__menu-list",
  ".chakra-modal__content",
  ".chakra-modal__overlay",
  ".axis-legend-menu"
] as const

export const kCfmDialogMarkers = [
  ".modal-dialog-container",
  ".confirm-dialog",
  ".alert-dialog"
] as const

export const kMarkerSelector = kMarkerClasses.join(",")
export const kMarkerRoleSelector = [...kMarkerClasses, ...kRoleSelectors].join(",")
export const kOverlayMarkerSelector = kOverlayMarkers.join(",")
export const kCfmDialogSelector = kCfmDialogMarkers.join(",")
export const kChakraPortalSelector = ".chakra-portal"

const HEADER_ANCESTOR_SELECTOR = ".menu-bar, .codap-menu-bar, .tool-shelf"
const TILE_ANCESTOR_SELECTOR = ".free-tile-component"

export interface ClassifyOptions {
  /** Recent click state for rule 5 upgrade */
  recentClick?: {
    timestampMs: number
    region: UiRegion
    componentId?: string
  }
  /** Override Date.now() for testing */
  nowMs?: number
}

export interface Classification {
  region: UiRegion
  componentId?: string
}

/** Build a reverse lookup: CSS selector -> dot-notation tourKey */
function buildTourSelectorLookup(): Map<string, string> {
  const map = new Map<string, string>()
  for (const [ns, group] of Object.entries(tourElements)) {
    for (const [name, element] of Object.entries(group)) {
      const el = element as { selector: string }
      map.set(el.selector, `${ns}.${name}`)
    }
  }
  return map
}

const tourSelectorLookup = buildTourSelectorLookup()

export function resolveTourKey(el: Element | null): string | undefined {
  if (!el) return undefined
  // Walk from the element upward so the nearest matching selector wins,
  // rather than whichever selector is iterated first (which would let
  // a container like `.tool-shelf` shadow a more-specific child button).
  let current: Element | null = el
  while (current) {
    for (const [selector, key] of tourSelectorLookup) {
      try {
        if (current.matches?.(selector)) return key
      } catch { /* invalid selector guard */ }
    }
    current = current.parentElement
  }
  return undefined
}

export function resolveInteractionKind(el: Element | null): string | undefined {
  if (!el) return undefined
  const ariaRole = el.getAttribute?.("role")
  if (ariaRole) return ariaRole
  const dataRole = el.getAttribute?.("data-role")
  if (dataRole) return dataRole
  return undefined
}

export function resolveDisabled(el: Element | null): boolean | undefined {
  if (!el) return undefined
  const native = (el as HTMLInputElement).disabled
  if (native === true) return true
  const ariaDisabled = el.getAttribute?.("aria-disabled")
  if (ariaDisabled === "true") return true
  return undefined
}

export function tileIdOf(el: Element | null): string | undefined {
  if (!el) return undefined
  const tile = el.closest?.(TILE_ANCESTOR_SELECTOR)
  return tile?.id || undefined
}

export function classifyNode(
  el: Element | null,
  options: ClassifyOptions = {},
  depth = 0,
  visited?: Set<Element>
): Classification {
  if (!el || depth > 5) return { region: "header" }
  if (visited?.has(el)) return { region: "header" }

  // Rule 1: inside .free-tile-component → workspace
  const tile = el.closest?.(TILE_ANCESTOR_SELECTOR)
  if (tile) return { region: "workspace", componentId: tile.id || undefined }

  // Rule 2: inside .menu-bar / .tool-shelf → header
  if (el.closest?.(HEADER_ANCESTOR_SELECTOR)) return { region: "header" }

  // Rule 3: aria-labelledby trigger lookup
  const ariaEl = el.closest?.("[aria-labelledby]")
  const labelledBy = ariaEl?.getAttribute?.("aria-labelledby") || undefined
  if (labelledBy) {
    const trigger = document.getElementById(labelledBy)
    if (trigger && trigger !== el) {
      const v = visited || new Set<Element>()
      v.add(el)
      if (ariaEl) v.add(ariaEl)
      return classifyNode(trigger, options, depth + 1, v)
    }
  }

  // Rule 4: CFM dialog marker → header
  try {
    if (el.matches?.(kCfmDialogSelector) || el.closest?.(kCfmDialogSelector)) {
      return { region: "header" }
    }
  } catch { /* ignore */ }

  // Rule 5: Chakra-portaled overlay → recent-click heuristic
  try {
    const inOverlay =
      el.matches?.(kOverlayMarkerSelector) ||
      !!el.closest?.(`${kChakraPortalSelector}, ${kOverlayMarkerSelector}`)
    if (inOverlay) {
      const now = options.nowMs ?? Date.now()
      const click = options.recentClick
      if (click && now - click.timestampMs < 500) {
        return { region: click.region, componentId: click.componentId }
      }
      return { region: "overlay" }
    }
  } catch { /* ignore */ }

  // Rule 6: fallback
  return { region: "header" }
}

export function buildTarget(el: Element | null): UiTarget {
  if (!el) return {}
  const testIdNode = el.closest?.("[data-testid]")
  const testId = testIdNode?.getAttribute("data-testid") ?? undefined
  const tourKey = resolveTourKey(el)
  const interactionKind = resolveInteractionKind(el)
  const disabled = resolveDisabled(el)
  const tag = (el as HTMLElement).tagName
  const target: UiTarget = {
    ...(testId != null ? { testId } : {}),
    ...(tourKey != null ? { tourKey } : {}),
    ...(interactionKind != null ? { interactionKind } : {}),
    ...(disabled ? { disabled: true } : {}),
    ...(tag != null ? { tag } : {})
  }
  const componentId = tileIdOf(el)
  if (componentId) target.componentId = componentId
  return target
}

export function isHiddenSubtree(node: Node | null): boolean {
  let current: Node | null = node
  while (current) {
    if (current.nodeType === 1) {
      const el = current as Element
      if (el.getAttribute?.("aria-hidden") === "true") return true
    }
    current = current.parentNode
  }
  return false
}

export function matchesMarker(el: Element): boolean {
  try {
    return el.matches?.(kMarkerRoleSelector) === true
  } catch {
    return false
  }
}

/** Query a subtree (including the root) for nodes matching the marker selectors */
export function findMarkers(root: Element, includeRoles = true): Element[] {
  const results: Element[] = []
  const selector = includeRoles ? kMarkerRoleSelector : kMarkerSelector
  try {
    if (root.matches?.(selector)) results.push(root)
  } catch { /* ignore */ }
  // Skip descendant walk on .free-tile-component — pre-mounted internal menus are not user-visible events
  if (root.classList?.contains?.("free-tile-component")) return results
  try {
    const descendants = root.querySelectorAll?.(selector)
    if (descendants) {
      for (const d of Array.from(descendants)) results.push(d)
    }
  } catch { /* ignore */ }
  return dedupeMarkers(results)
}

/**
 * Remove redundant role-based markers (role=menu, role=dialog) when a class-based
 * marker exists in the same ancestor/descendant chain. Class markers are specific
 * (e.g. `.menu-list-container`); role markers are generic fallbacks. React Aria's
 * Popover wraps menus with role="dialog" AND the inner element matches a class
 * marker — without dedup we'd emit two `appear` notices per menu open.
 *
 * role="menuitem" is always kept — menuitems are leaves, not redundant containers.
 */
function dedupeMarkers(markers: Element[]): Element[] {
  if (markers.length <= 1) return markers
  const classMarkers = markers.filter(el => !isRoleOnlyMarker(el))
  return markers.filter(el => {
    if (!isRoleOnlyContainerMarker(el)) return true
    // Drop if any class-based marker is an ancestor OR descendant of this role marker.
    for (const cm of classMarkers) {
      if (cm === el) continue
      if (cm.contains(el) || el.contains(cm)) return false
    }
    return true
  })
}

function isRoleOnlyMarker(el: Element): boolean {
  try {
    return !el.matches(kMarkerSelector)
  } catch {
    return false
  }
}

function isRoleOnlyContainerMarker(el: Element): boolean {
  if (!isRoleOnlyMarker(el)) return false
  const role = el.getAttribute?.("role")
  return role === "menu" || role === "dialog"
}
