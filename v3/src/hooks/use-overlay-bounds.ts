import { useEffect, useState } from "react"
import { useDataConfigurationContext } from "../components/graph/hooks/use-data-configuration-context"
import { useGraphLayoutContext } from "../components/graph/models/graph-layout"

interface IProps {
  target: Element | null
  portal?: Element | null
}
interface IBounds {
  left: number
  top: number
  width: number
  height: number
}
export function useOverlayBounds({ target, portal }: IProps) {
  const [overlayBounds, setOverlayBounds] = useState<IBounds | null>(null)
  const {graphHeight, legendHeight} = useGraphLayoutContext()
  const { ...all } = useGraphLayoutContext()
  console.log("ALL!", all)
  useEffect(() => {
    // track the bounds of the target element relative to the portal element
    const observer = target && new ResizeObserver(() => {
      const portalBounds = portal?.getBoundingClientRect()
      const targetBounds = target?.getBoundingClientRect()
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
  }, [portal, target, graphHeight, legendHeight])

  return overlayBounds
}
