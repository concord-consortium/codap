import { useEffect, useState } from "react"

interface IProps {
  target: Element | null
  portal?: Element | null
  graphHeight?: number | null
}
interface IBounds {
  left: number
  top: number
  width: number
  height: number
}
export function useOverlayBounds({ target, portal, graphHeight }: IProps) {
  const [overlayBounds, setOverlayBounds] = useState<IBounds | null>(null)

  useEffect(() => {
    // track the bounds of the target element relative to the portal element
    const observer = target && new ResizeObserver(() => {
      const portalBounds = portal?.getBoundingClientRect()
      const targetBounds = target?.getBoundingClientRect()
      console.log("useOverlayBounds: ", target)
      if (targetBounds) {
        setOverlayBounds({
          left: targetBounds.x - (portalBounds?.x ?? 0),
          top: targetBounds.y - (portalBounds?.y ?? 0),
          width: targetBounds.width,
          height: targetBounds.height
        })
      }
    })
    target && observer?.observe(target)

    return () => observer?.disconnect()
  }, [portal, target, graphHeight])

  return overlayBounds
}
