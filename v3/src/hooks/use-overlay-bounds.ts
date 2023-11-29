import { useEffect, useState } from "react"

interface IProps {
  target: Element | null
  portal?: Element | null
}

interface Bounds {
  left?: number
  top?: number
  width?: number
  height?: number
}

function isSameBounds(a: Bounds, b: Bounds) {
  return a.left === b.left && a.top === b.top &&
          a.width === b.width && a.height === b.height
}

export function useOverlayBounds({ target, portal }: IProps) {
  const [overlayBounds, setOverlayBounds] = useState<Bounds>({})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const portalBounds = portal?.getBoundingClientRect()
    const targetBounds = target?.getBoundingClientRect()
    if (targetBounds) {
      const bounds = {
        left: targetBounds.x - (portalBounds?.x ?? 0),
        top: targetBounds.y - (portalBounds?.y ?? 0),
        width: targetBounds.width,
        height: targetBounds.height
      }
      if (!isSameBounds(bounds, overlayBounds)) {
        // triggers re-render of component using the hook
        setOverlayBounds(bounds)
      }
    }
    // no dependencies so effect runs after every render
  })
  return overlayBounds
}
