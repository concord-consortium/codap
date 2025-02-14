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
  /**
   * The info gets attached to the pointerdown handler. This handler.info can
   * be inspected by the chrome dev tools. In the "Elements" tab select the html
   * element, go to the "Event Listeners" sub tab, make sure the "Ancestors" box is checked,
   * expand the "pointerdown" and look at the entries for "use-outside-pointer-down.ts"
   */
  info?: any
}

/**
 * Example, used in components like Dialogs and Popovers, so they can close
 * when a user clicks outside them.
 */
export function useOutsidePointerDown({ ref, handler, enabled = true, info }: IProps) {
  const onPointerDown = useCallbackRef((e: Event) => {
    if (ref && isValidEvent(e, ref) && handler) {
      handler(e)
    }
  })

  if (onPointerDown) {
    (onPointerDown as any).info = info
  }

  useEffect(() => {
    if (!enabled) return

    // listen for pointerdown because D3 drag handlers intercept subsequent mouse events
    const doc = getOwnerDocument(ref?.current)
    doc.addEventListener("pointerdown", onPointerDown, true)

    return () => {
      doc.removeEventListener("pointerdown", onPointerDown, true)
    }
  }, [enabled, ref, onPointerDown])
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

  // Note: If ref.current is undefined, isValidEvent will return true
  // so useOutsidePointerDown will call the callback. The code using
  // this hasn't been reviewed to see if this behavior is relied on.
  return !ref.current?.contains(target)
}

function getOwnerDocument(node?: Element | null): Document {
  return node?.ownerDocument ?? document
}
