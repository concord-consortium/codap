import React, { createContext, useCallback, useContext, useEffect, useRef } from "react"
import { tinykeys } from "tinykeys"
import { kFocusableSelector, kSectionNextShortcut, kSectionPrevShortcut } from "../accessibility-constants"

interface SectionEntry {
  id: string
  lastFocused: HTMLElement | null
  order: number
  rootEl: React.RefObject<HTMLElement | null>
}

interface SectionNavigationContextValue {
  registerSection: (id: string, ref: React.RefObject<HTMLElement | null>, order: number) => void
  unregisterSection: (id: string) => void
}

export const SectionNavigationContext = createContext<SectionNavigationContextValue | null>(null)

/**
 * Hook for the App component. Creates the section registry, handles Ctrl+. / Shift+Ctrl+.
 * shortcuts, and provides the SectionNavigationProvider.
 */
export function useSectionNavigation() {
  const sectionsRef = useRef<SectionEntry[]>([])
  const activeSectionIndexRef = useRef<number>(-1)

  const getSortedSections = useCallback(() => {
    return [...sectionsRef.current].sort((a, b) => a.order - b.order)
  }, [])

  const registerSection = useCallback((
    id: string, ref: React.RefObject<HTMLElement | null>, order: number
  ) => {
    // Remove existing entry with this id to avoid duplicates
    sectionsRef.current = sectionsRef.current.filter(s => s.id !== id)
    sectionsRef.current.push({ id, rootEl: ref, order, lastFocused: null })
  }, [])

  const unregisterSection = useCallback((id: string) => {
    sectionsRef.current = sectionsRef.current.filter(s => s.id !== id)
  }, [])

  const saveCurrentFocus = useCallback(() => {
    const sorted = getSortedSections()
    const activeElement = document.activeElement as HTMLElement | null
    if (!activeElement) return

    // Find which section currently contains focus and save it
    for (let i = 0; i < sorted.length; i++) {
      const section = sorted[i]
      if (section.rootEl.current?.contains(activeElement)) {
        section.lastFocused = activeElement
        activeSectionIndexRef.current = i
        break
      }
    }
  }, [getSortedSections])

  const focusSection = useCallback((index: number) => {
    const sorted = getSortedSections()
    if (sorted.length === 0 || index < 0 || index >= sorted.length) return

    const section = sorted[index]
    const rootEl = section.rootEl.current
    if (!rootEl) return

    activeSectionIndexRef.current = index

    // Try to restore last-focused element
    if (
      section.lastFocused &&
      document.contains(section.lastFocused) &&
      rootEl.contains(section.lastFocused)
    ) {
      section.lastFocused.focus()
      return
    }

    // Fall back to first focusable element
    const firstFocusable = rootEl.querySelector<HTMLElement>(kFocusableSelector)
    if (firstFocusable) {
      firstFocusable.focus()
      return
    }

    // Last resort: focus the root element itself
    if (rootEl.tabIndex < 0) {
      rootEl.setAttribute("tabindex", "-1")
    }
    rootEl.focus()
  }, [getSortedSections])

  const navigateSection = useCallback((direction: 1 | -1) => {
    const sorted = getSortedSections()
    if (sorted.length === 0) return

    // Save focus in the current section before leaving
    saveCurrentFocus()

    // Determine the current section index. If focus isn't in any registered section,
    // detect which section contains the active element as a fallback.
    let currentIndex = activeSectionIndexRef.current
    if (currentIndex < 0) {
      const activeElement = document.activeElement as HTMLElement | null
      if (activeElement && activeElement !== document.body) {
        currentIndex = sorted.findIndex(s => s.rootEl.current?.contains(activeElement))
      }
    }

    let nextIndex: number
    if (currentIndex < 0) {
      // No section active — start at first (forward) or last (backward)
      nextIndex = direction === 1 ? 0 : sorted.length - 1
    } else {
      nextIndex = (currentIndex + direction + sorted.length) % sorted.length
    }

    focusSection(nextIndex)
  }, [focusSection, getSortedSections, saveCurrentFocus])

  // Prevent Tab from leaving the menu bar and tool shelf sections.
  // Per the navigation model, Tab never crosses section boundaries — only Ctrl+. does.
  // The tile area is excluded here because it has its own per-tile tab trapping.
  useEffect(() => {
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || e.ctrlKey || e.altKey || e.metaKey) return
      const activeElement = document.activeElement as HTMLElement | null
      if (!activeElement) return

      const sorted = getSortedSections()
      for (const section of sorted) {
        if (section.id === "tilearea") continue
        if (section.rootEl.current?.contains(activeElement)) {
          e.preventDefault()
          return
        }
      }
    }
    window.addEventListener("keydown", handleTab)
    return () => window.removeEventListener("keydown", handleTab)
  }, [getSortedSections])

  // Bind tinykeys shortcuts
  useEffect(() => {
    const unsubscribe = tinykeys(window, {
      [kSectionNextShortcut]: (e) => {
        e.preventDefault()
        navigateSection(1)
      },
      [kSectionPrevShortcut]: (e) => {
        e.preventDefault()
        navigateSection(-1)
      }
    })
    return unsubscribe
  }, [navigateSection])

  const contextValue = useRef<SectionNavigationContextValue>({
    registerSection,
    unregisterSection
  })

  const Provider = useCallback(({ children }: { children: React.ReactNode }) => {
    return React.createElement(
      SectionNavigationContext.Provider,
      { value: contextValue.current },
      children
    )
  }, [])

  return { SectionNavigationProvider: Provider }
}

/**
 * Hook for child components (MenuBar, ToolShelf, Container) to register themselves as sections.
 */
export function useRegisterSection(id: string, ref: React.RefObject<HTMLElement | null>, order: number) {
  const context = useContext(SectionNavigationContext)

  useEffect(() => {
    if (!context) return
    context.registerSection(id, ref, order)
    return () => context.unregisterSection(id)
  }, [context, id, ref, order])
}
