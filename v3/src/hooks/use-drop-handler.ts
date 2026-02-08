import { useEffect, useRef } from "react"

export interface IDropHandler {
  selector: string
  onDrop?: (event: DragEvent) => void
  onSetIsDragOver?: (isDragOver: boolean) => void
}

export const useDropHandler = ({
  selector, onDrop, onSetIsDragOver: setIsDragOver
}: IDropHandler) => {
  const eltRef = useRef<HTMLElement | null>(null)

  useEffect(function installListeners() {
    const elt = document.querySelector<HTMLElement>(selector)
    eltRef.current = elt

    function dragOverHandler(event: DragEvent) {
      // Prevent default behavior (Prevent file from being opened)
      event.preventDefault()
      setIsDragOver?.(true)
    }

    function dropHandler(event: DragEvent) {

      // Prevent default behavior (Prevent file from being opened by browser)
      event.preventDefault()
      // Prevent event from being handled more than once
      event.stopPropagation()

      onDrop?.(event)

      setIsDragOver?.(false)
    }

    elt?.addEventListener('dragover', dragOverHandler)
    elt?.addEventListener('drop', dropHandler)

    return () => {
      elt?.removeEventListener('dragover', dragOverHandler)
      elt?.removeEventListener('drop', dropHandler)
    }
  }, [onDrop, selector, setIsDragOver])

  // return element to which listeners were attached; useful for tests
  return eltRef.current
}
