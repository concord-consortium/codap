import { observable } from "mobx"
import { useEffect } from "react"

/**
 * Global observable set tracking which keys are currently pressed.
 * Being a MobX observable, any MobX reaction or observer that reads from this
 * (via `isKeyDown`) will automatically react to key state changes.
 */
const keysDown = observable.set<string>()

/**
 * Check if a key is currently pressed.
 * @param key - The key to check (e.g., 'Alt', 'Shift', 'Meta', 'Control', 'a', 'Enter')
 * @returns true if the key is currently pressed
 *
 * Since `keysDown` is a MobX observable, calling this function inside a MobX
 * `reaction`, `autorun`, or `observer` component will cause it to re-run
 * when the key state changes.
 */
export const isKeyDown = (key: string) => keysDown.has(key)

/**
 * Hook that sets up global keyboard event listeners to track key states.
 * Must be called once at the app level (already done in app.tsx).
 *
 * Tracks:
 * - All keys via keydown/keyup events
 * - Modifier keys (Shift, Alt, Meta, Control) via click events to handle
 *   cases where modifier state changes while the window doesn't have focus
 */
export const useKeyStates = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keysDown.add(e.key)
    const handleKeyUp = (e: KeyboardEvent) => keysDown.delete(e.key)
    const updateKey = (key: string, isDown: boolean) => isDown ? keysDown.add(key) : keysDown.delete(key)
    const handleMouseEvent = (e: MouseEvent) => {
      const keys: Record<string, boolean> = {
        Shift: e.shiftKey, Alt: e.altKey, Meta: e.metaKey, Control: e.ctrlKey
      }
      Object.keys(keys).forEach(key => updateKey(key, keys[key]))
    }
    window.addEventListener("keydown", handleKeyDown, { capture: true })
    window.addEventListener("keyup", handleKeyUp, { capture: true })
    window.addEventListener("click", handleMouseEvent, { capture: true })
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true })
      window.removeEventListener("keyup", handleKeyUp, { capture: true })
      window.removeEventListener("click", handleMouseEvent, { capture: true })
    }
  }, [])
}
