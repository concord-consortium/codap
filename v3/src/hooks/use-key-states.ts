import { useEffect } from "react"

const keysDown = new Set<string>

export const isKeyDown = (key: string) => keysDown.has(key)

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
