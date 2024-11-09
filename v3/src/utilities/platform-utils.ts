export const isMac = navigator.platform.toLowerCase().includes("mac")

export const cmdKey = isMac ? "Meta" : "Control"

export function isCommandKeyDown(event: KeyboardEvent | React.KeyboardEvent) {
  return (isMac && event.metaKey) || (!isMac && event.ctrlKey)
}
