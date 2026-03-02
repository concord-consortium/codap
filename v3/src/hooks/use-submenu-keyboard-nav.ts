import React, { RefObject, useCallback, useEffect } from "react"

/**
 * Returns a keydown handler for a parent MenuList that opens a submenu
 * when ArrowRight is pressed on a trigger item identified by a data attribute.
 *
 * Chakra MenuItem with as="div" doesn't forward onKeyDown to user handlers,
 * so this works by catching the bubbled event at the MenuList level and
 * walking up the DOM to find the trigger element.
 *
 * @param dataAttr kebab-case data attribute name (e.g., "collection-id" for data-collection-id)
 * @param onOpenSubmenu callback receiving the data attribute value
 *
 * Usage:
 *   const handleKeyDown = useSubmenuOpenOnArrowRight("collection-id", handleOpenSubmenu)
 *   <MenuList onKeyDown={handleKeyDown}>
 *     <MenuItem as="div" data-collection-id={id}>...</MenuItem>
 */
export function useSubmenuOpenOnArrowRight(
  dataAttr: string,
  onOpenSubmenu: (id: string) => void
) {
  return useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      const menuItem = (e.target as HTMLElement).closest(`[data-${dataAttr}]`)
      const id = menuItem?.getAttribute(`data-${dataAttr}`)
      if (id) {
        e.preventDefault()
        e.stopPropagation()
        onOpenSubmenu(id)
      }
    }
  }, [dataAttr, onOpenSubmenu])
}

interface UseSubmenuCloseOptions {
  /** Whether the submenu is currently open */
  isOpen: boolean
  /** Ref to the submenu MenuList element (for focusing first item on open) */
  submenuRef: RefObject<HTMLElement | null>
  /** Ref to the trigger element in the parent menu (for restoring focus on close) */
  triggerRef: RefObject<HTMLElement | null>
  /** Callback to close the submenu */
  onClose: () => void
}

/**
 * Manages submenu keyboard lifecycle:
 * - Focuses the first menuitem when the submenu opens
 * - Returns a keydown handler that closes the submenu on ArrowLeft/Escape
 *   and restores focus to the trigger element
 *
 * Usage:
 *   const handleSubmenuKeyDown = useSubmenuCloseOnArrowLeft({ isOpen, submenuRef, triggerRef, onClose })
 *   <MenuList ref={submenuRef} onKeyDown={handleSubmenuKeyDown}>
 */
export function useSubmenuCloseOnArrowLeft({
  isOpen,
  submenuRef,
  triggerRef,
  onClose
}: UseSubmenuCloseOptions) {
  // Focus first menuitem when submenu opens
  useEffect(() => {
    if (isOpen && submenuRef.current) {
      requestAnimationFrame(() => {
        const firstItem = submenuRef.current?.querySelector('[role="menuitem"]') as HTMLElement
        firstItem?.focus()
      })
    }
  }, [isOpen, submenuRef])

  // ArrowLeft or Escape closes submenu and restores focus to trigger
  return useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "Escape") {
      e.preventDefault()
      e.stopPropagation()
      onClose()
      requestAnimationFrame(() => {
        triggerRef.current?.focus()
      })
    }
  }, [onClose, triggerRef])
}
