import { useEffect } from "react"

const keysDown = new Set<string>

export const isKeyDown = (key: string) => keysDown.has(key)

export const useKeyStates = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keysDown.add(e.key)
    const handleKeyUp = (e: KeyboardEvent) => keysDown.delete(e.key)
    const updateKey = (key: string, e: MouseEvent) => e.shiftKey ? keysDown.add(key) : keysDown.delete(key)
    const handleMouseEvent = (e: MouseEvent) => {
      ["Shift", "Alt", "Meta", "Control"].forEach(key => updateKey(key, e))
    }
    window.addEventListener("keydown", handleKeyDown , { capture: true })
    window.addEventListener("keyup", handleKeyUp, { capture: true })
    window.addEventListener("click", handleMouseEvent, { capture: true })
    return () => {
      window.removeEventListener("keydown", handleKeyDown , { capture: true })
      window.removeEventListener("keyup", handleKeyUp, { capture: true })
      window.removeEventListener("click", handleMouseEvent, { capture: true })
    }
  }, [])
}
