/*A substitute, for the moment, for Chakra's useOutsideClick hook see line 64 */

import { useEffect, useRef } from "react"
import { useCallbackRef } from "@chakra-ui/react-use-callback-ref"

export interface UseCodapOutsideClickProps {
  /**
   * Whether the hook is enabled
   */
  enabled?: boolean
  /**
   * The reference to a DOM element.
   */
  ref: React.RefObject<HTMLElement>
  /**
   * Function invoked when a click is triggered outside the referenced element.
   */
  handler?: (e: Event) => void
}

/**
 * Example, used in components like Dialogs and Popovers, so they can close
 * when a user clicks outside them.
 */
export function useCodapOutsideClick(props: UseCodapOutsideClickProps) {
  const { ref, handler, enabled = true } = props
  const savedHandler = useCallbackRef(handler)

  const stateRef = useRef({
    isPointerDown: false,
    ignoreEmulatedMouseEvents: false,
  })

  const state = stateRef.current

  useEffect(() => {
    if (!enabled) return
    const onPointerDown: any = (e: PointerEvent) => {
      if (isValidEvent(e, ref)) {
        state.isPointerDown = true
      }
    }

    const onMouseUp: any = (event: MouseEvent) => {
      if (state.ignoreEmulatedMouseEvents) {
        state.ignoreEmulatedMouseEvents = false
        return
      }

      if (state.isPointerDown && handler && isValidEvent(event, ref)) {
        state.isPointerDown = false
        savedHandler(event)
      }
    }

    const onTouchEnd = (event: TouchEvent) => {
      state.ignoreEmulatedMouseEvents = true
      if (handler && state.isPointerDown && isValidEvent(event, ref)) {
        state.isPointerDown = false
        savedHandler(event)
      }
    }

    // after events have passed through D3 target, they are Pointer events, not "mouseup"
    // so we need Chakra to register "pointerup" and "pointerdown"  here
    const doc = getOwnerDocument(ref.current)
    doc.addEventListener("pointerdown", onPointerDown, true)
    doc.addEventListener("pointerup", onMouseUp, true)
    doc.addEventListener("mousedown", onPointerDown, true)
    doc.addEventListener("mouseup", onMouseUp, true)
    doc.addEventListener("touchstart", onPointerDown, true)
    doc.addEventListener("touchend", onTouchEnd, true)

    return () => {
      doc.removeEventListener("pointerdown", onPointerDown, true)
      doc.removeEventListener("pointerup", onMouseUp, true)
      doc.removeEventListener("mousedown", onPointerDown, true)
      doc.removeEventListener("mouseup", onMouseUp, true)
      doc.removeEventListener("touchstart", onPointerDown, true)
      doc.removeEventListener("touchend", onTouchEnd, true)
    }
  }, [handler, ref, savedHandler, state, enabled])
}

function isValidEvent(event: any, ref: React.RefObject<HTMLElement>) {
  const target = event.target as HTMLElement
  if (event.button > 0) return false
  // if the event target is no longer in the document
  if (target) {
    const doc = getOwnerDocument(target)
    if (!doc.contains(target)) return false
  }

  return !ref.current?.contains(target)
}

function getOwnerDocument(node?: Element | null): Document {
  return node?.ownerDocument ?? document
}
