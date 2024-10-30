/* Patterned after Chakra's useOutsideClick hook */

import { useEffect } from "react"
import { useCallbackRef } from "./use-callback-ref"

interface IProps {
  /**
   * Whether the hook is enabled
   */
  enabled?: boolean
  /**
   * The reference to a DOM element.
   */
  ref: React.RefObject<HTMLElement> | null
  /**
   * Function invoked when a click is triggered outside the referenced element.
   */
  handler?: (e: Event) => void
}

/**
 * Example, used in components like Dialogs and Popovers, so they can close
 * when a user clicks outside them.
 */
export function useOutsidePointerDown({ ref, handler, enabled = true }: IProps) {
  const savedHandler = useCallbackRef(handler)

  useEffect(() => {
    if (!enabled) return

    const onPointerDown: any = (e: PointerEvent) => {
      if (ref && isValidEvent(e, ref)) {
        savedHandler(e)
      }
    }

    // listen for pointerdown because D3 drag handlers intercept subsequent mouse events
    const doc = getOwnerDocument(ref?.current)
    doc.addEventListener("pointerdown", onPointerDown, true)

    return () => {
      doc.removeEventListener("pointerdown", onPointerDown, true)
    }
  }, [enabled, ref, savedHandler])
}

function isValidEvent(event: any, ref: React.RefObject<HTMLElement>) {
  const target = event.target as HTMLElement
  if (event.button > 0) return false
  // if the event target is no longer in the document
  if (target) {
    const doc = getOwnerDocument(target)
    if (!doc.contains(target)) return false
  }
  // Ignore outside clicks if the target is a portal
  // This is to prevent the inspector panel from closing when a user clicks on a color picker
  if (target.closest('.chakra-portal')) return false

  return !ref.current?.contains(target)
}

function getOwnerDocument(node?: Element | null): Document {
  return node?.ownerDocument ?? document
}
