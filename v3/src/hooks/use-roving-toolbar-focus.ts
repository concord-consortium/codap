import React, { useCallback, useEffect, useRef } from "react"

const navigationKeys = ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"]
const rememberedActiveIndices = new Map<string, number>()

interface IProps {
  dependencies?: React.DependencyList
  enabled?: boolean
  getItems: () => HTMLElement[]
  orientation: "horizontal" | "vertical"
  persistenceKey?: string
  wrap?: boolean
}

// Items with the HTML disabled attribute can't receive focus, but aria-disabled items can.
// For Tab order, prefer non-disabled items. For arrow keys, allow all items.
function isNativelyDisabled(item: HTMLElement) {
  return item.hasAttribute("disabled")
}

function getNearestNonDisabledIndex(items: HTMLElement[], preferredIndex: number) {
  if (!items.length) return -1
  if (preferredIndex < 0 || preferredIndex >= items.length) {
    preferredIndex = Math.max(0, Math.min(preferredIndex, items.length - 1))
  }
  if (!isNativelyDisabled(items[preferredIndex])) return preferredIndex

  for (let i = preferredIndex + 1; i < items.length; i++) {
    if (!isNativelyDisabled(items[i])) return i
  }
  for (let i = preferredIndex - 1; i >= 0; i--) {
    if (!isNativelyDisabled(items[i])) return i
  }
  return -1
}

export function useRovingToolbarFocus({
  dependencies = [],
  enabled = true,
  getItems,
  orientation,
  persistenceKey,
  wrap = false
}: IProps) {
  const activeIndexRef = useRef(persistenceKey ? (rememberedActiveIndices.get(persistenceKey) ?? 0) : 0)

  const updateRememberedIndex = useCallback((index: number) => {
    activeIndexRef.current = index
    if (persistenceKey) {
      rememberedActiveIndices.set(persistenceKey, index)
    }
  }, [persistenceKey])

  const applyTabIndices = useCallback((nextIndex?: number, { skipDisabled = true } = {}) => {
    if (!enabled) return

    const items = getItems()
    if (!items.length) return

    const preferredIndex = Math.max(0, Math.min(nextIndex ?? activeIndexRef.current, items.length - 1))
    // For Tab order, prefer non-disabled items. For arrow key nav, use the exact index.
    const resolvedIndex = skipDisabled
      ? getNearestNonDisabledIndex(items, preferredIndex)
      : preferredIndex
    const clampedIndex = resolvedIndex >= 0 ? resolvedIndex : preferredIndex
    updateRememberedIndex(clampedIndex)
    items.forEach((item, index) => {
      item.tabIndex = index === clampedIndex ? 0 : -1
    })
  }, [enabled, getItems, updateRememberedIndex])

  // Re-apply tab indices when caller-provided dependencies change (e.g. toolbar
  // items appearing/disappearing). Needed because getItems may be stable while
  // the DOM items it queries can change for external reasons.
  const dependencyKey = JSON.stringify(dependencies)
  useEffect(() => {
    applyTabIndices()
  }, [applyTabIndices, dependencyKey])

  const updateActiveIndexFromTarget = useCallback((target: EventTarget | null) => {
    if (!enabled || !(target instanceof HTMLElement)) return

    const items = getItems()
    const nextIndex = items.findIndex(item => item === target || item.contains(target))
    if (nextIndex >= 0) {
      applyTabIndices(nextIndex)
    }
  }, [applyTabIndices, enabled, getItems])

  const onFocusCapture = useCallback((e: React.FocusEvent<HTMLElement>) => {
    updateActiveIndexFromTarget(e.target)
  }, [updateActiveIndexFromTarget])

  const handleToolbarKeyDown = useCallback((target: EventTarget | null, key: string) => {
    if (!enabled || !navigationKeys.includes(key)) return false
    const items = getItems()
    const currentIndex = items.findIndex(item => item === target || item.contains(target as Node))
    if (currentIndex === -1) return false

    let nextIndex: number
    if (key === "Home") {
      nextIndex = 0
    } else if (key === "End") {
      nextIndex = items.length - 1
    } else {
      const forwardKey = orientation === "horizontal" ? "ArrowRight" : "ArrowDown"
      const backwardKey = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp"
      if (key !== forwardKey && key !== backwardKey) return false

      nextIndex = key === forwardKey ? currentIndex + 1 : currentIndex - 1
      if (wrap) {
        nextIndex = (nextIndex + items.length) % items.length
      } else {
        nextIndex = Math.max(0, Math.min(nextIndex, items.length - 1))
      }
    }

    applyTabIndices(nextIndex, { skipDisabled: false })
    items[nextIndex]?.focus()
    return true
  }, [applyTabIndices, enabled, getItems, orientation, wrap])

  const onKeyDownCapture = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    if (!handleToolbarKeyDown(e.target, e.key)) return

    e.preventDefault()
    e.stopPropagation()
  }, [handleToolbarKeyDown])

  return {
    onFocusCapture,
    onKeyDownCapture
  }
}
