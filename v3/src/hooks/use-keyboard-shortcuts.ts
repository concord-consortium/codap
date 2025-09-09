import { useEffect } from "react"
import { tinykeys } from "tinykeys"
import { appState } from "../models/app-state"

export const useKeyboardShortcuts = () => {
  useEffect(function handleKeyboardShortcuts() {

    const isEditable = (el: Element | null) => {
      if (!el) return false
      if (el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable)) {
        return true
      }
    }

    const okToUndoRedo = (e: KeyboardEvent, test: boolean) => {
      const target = e.target as Element | null
      // don't intercept undo/redo if focused on editable element
      if (isEditable(target)) return false
      if (test) {
        e.preventDefault()
        e.stopPropagation()
      }
      return test
    }

    const unsubscribe = tinykeys(window, {
      "$mod+z": (e) => {
        okToUndoRedo(e, appState.document.canUndo) && appState.document.undoLastAction()
      },
      "$mod+Shift+Z": (e) => {
        okToUndoRedo(e, appState.document.canRedo) && appState.document.redoLastAction()
      },
      "$mod+y": (e) => {
        okToUndoRedo(e, appState.document.canRedo) && appState.document.redoLastAction()
      }
    })
    return () => {
      unsubscribe()
    }
  }, [])
}
