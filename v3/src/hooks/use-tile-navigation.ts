import { useCallback, useEffect } from "react"
import { tinykeys } from "tinykeys"
import {
  kFocusableSelector, kTileInspectorToggleShortcut, kTileNextShortcut, kTilePrevShortcut, kTilesMenuShortcut
} from "../accessibility-constants"
import { appState } from "../models/app-state"
import { isFreeTileLayout, isFreeTileRow } from "../models/document/free-tile-row"
import { uiState } from "../models/ui-state"

/**
 * Returns visible tile IDs sorted by visual position (top-to-bottom, left-to-right).
 */
function getTilesInVisualOrder(): string[] {
  const row = appState.document.content?.getRowByIndex(0)
  if (!isFreeTileRow(row)) return []

  const kRowThreshold = 50 // pixels — tiles within this vertical distance are treated as same row
  return row.tileIds
    .map(id => {
      const layout = row.getTileLayout(id)
      const pos = row.getTilePosition(id)
      const isHidden = isFreeTileLayout(layout) ? !!layout.isHidden : false
      return { id, x: pos.left ?? 0, y: pos.top ?? 0, isHidden }
    })
    .filter(t => !t.isHidden)
    .sort((a, b) => {
      const rowDiff = a.y - b.y
      if (Math.abs(rowDiff) > kRowThreshold) return rowDiff
      return a.x - b.x
    })
    .map(t => t.id)
}

// Module-level Map so exported functions can access last-focused state
const lastFocusedPerTile = new Map<string, HTMLElement>()

export function clearLastFocusedForTile(tileId: string) {
  lastFocusedPerTile.delete(tileId)
}

/**
 * Moves DOM focus to the first focusable element within a tile's .codap-component.
 * Does not attempt to restore last-focused element.
 */
export function focusTileContent(tileId: string) {
  const tileEl = document.getElementById(tileId)
  if (!tileEl) return

  const codapComponent = tileEl.querySelector<HTMLElement>(".codap-component")
  const firstFocusable = codapComponent?.querySelector<HTMLElement>(kFocusableSelector)
  if (firstFocusable) {
    firstFocusable.focus()
    return
  }

  // Last resort: make the container itself focusable so focus isn't lost entirely
  const target = codapComponent ?? tileEl
  if (target.tabIndex < 0) {
    target.setAttribute("tabindex", "-1")
  }
  target.focus()
}

/**
 * Returns focus from the inspector panel to the tile content, restoring the
 * last-focused element if available.
 */
export function returnToTileContent(tileId: string) {
  const tileEl = document.getElementById(tileId)
  if (!tileEl) return

  const codapComponent = tileEl.querySelector<HTMLElement>(".codap-component")
  if (!codapComponent) return

  const lastFocused = lastFocusedPerTile.get(tileId)
  if (lastFocused && document.contains(lastFocused) && codapComponent.contains(lastFocused)) {
    lastFocused.focus()
  } else {
    if (lastFocused) lastFocusedPerTile.delete(tileId)
    const firstFocusable = codapComponent.querySelector<HTMLElement>(kFocusableSelector)
    if (firstFocusable) {
      firstFocusable.focus()
    } else {
      // Last resort: make the container itself focusable so focus isn't lost entirely
      if (codapComponent.tabIndex < 0) {
        codapComponent.setAttribute("tabindex", "-1")
      }
      codapComponent.focus()
    }
  }
}

/**
 * Hook that provides tile-to-tile navigation (Ctrl+;), tile/inspector toggle (Ctrl+\),
 * and Tiles menu shortcut (Ctrl+').
 */
export function useTileNavigation() {

  const focusTile = useCallback((tileId: string) => {
    uiState.setFocusedTile(tileId)

    const tileEl = document.getElementById(tileId)
    if (!tileEl) return

    // Try to restore last-focused element within the tile
    const lastFocused = lastFocusedPerTile.get(tileId)
    if (lastFocused && document.contains(lastFocused) && tileEl.contains(lastFocused)) {
      lastFocused.focus()
      return
    }
    // Clean up stale entry if restore failed
    if (lastFocused) lastFocusedPerTile.delete(tileId)

    focusTileContent(tileId)
  }, [])

  const saveCurrentTileFocus = useCallback(() => {
    const activeElement = document.activeElement as HTMLElement | null
    const focusedTileId = uiState.focusedTile
    if (activeElement && focusedTileId) {
      const tileEl = document.getElementById(focusedTileId)
      if (tileEl?.contains(activeElement)) {
        lastFocusedPerTile.set(focusedTileId, activeElement)
      }
    }
  }, [])

  const navigateTile = useCallback((direction: 1 | -1) => {
    const tileIds = getTilesInVisualOrder()
    if (tileIds.length === 0) return

    saveCurrentTileFocus()

    const currentTileId = uiState.focusedTile
    const currentIndex = currentTileId ? tileIds.indexOf(currentTileId) : -1
    let nextIndex: number
    if (currentIndex < 0) {
      nextIndex = direction === 1 ? 0 : tileIds.length - 1
    } else {
      nextIndex = (currentIndex + direction + tileIds.length) % tileIds.length
    }

    focusTile(tileIds[nextIndex])
  }, [focusTile, saveCurrentTileFocus])

  const toggleInspector = useCallback(() => {
    const focusedTileId = uiState.focusedTile
    if (!focusedTileId) return

    const tileEl = document.getElementById(focusedTileId)
    if (!tileEl) return

    const activeElement = document.activeElement as HTMLElement | null
    const inspectorPanel = tileEl.querySelector<HTMLElement>(".inspector-panel")
    const codapComponent = tileEl.querySelector<HTMLElement>(".codap-component")

    if (!inspectorPanel || !codapComponent) return

    const isInInspector = inspectorPanel.contains(activeElement)

    if (isInInspector) {
      returnToTileContent(focusedTileId)
    } else {
      // Save current focus position in tile content
      if (activeElement && codapComponent.contains(activeElement)) {
        lastFocusedPerTile.set(focusedTileId, activeElement)
      }
      // Move focus to inspector panel
      const firstInspectorFocusable = inspectorPanel.querySelector<HTMLElement>(kFocusableSelector)
      if (firstInspectorFocusable) {
        firstInspectorFocusable.focus()
      }
    }
  }, [])

  const openTilesMenu = useCallback(() => {
    const tilesMenuButton = document.querySelector<HTMLElement>("[data-action='tiles-menu']")
    if (tilesMenuButton) {
      tilesMenuButton.focus()
      tilesMenuButton.click()
    }
  }, [])

  useEffect(() => {
    const unsubscribe = tinykeys(window, {
      [kTileNextShortcut]: (e) => {
        e.preventDefault()
        navigateTile(1)
      },
      [kTilePrevShortcut]: (e) => {
        e.preventDefault()
        navigateTile(-1)
      },
      [kTileInspectorToggleShortcut]: (e) => {
        e.preventDefault()
        toggleInspector()
      },
      [kTilesMenuShortcut]: (e) => {
        e.preventDefault()
        openTilesMenu()
      }
    })
    return unsubscribe
  }, [navigateTile, toggleInspector, openTilesMenu])
}
