import { useEffect, useRef } from "react"
import { PixiPoints } from "../pixi/pixi-points"

interface IProps {
  addInitialPixiPoints?: boolean
}

export function usePixiPointsArray(props?: IProps) {
  const { addInitialPixiPoints = false } = props || {}
  const pixiPointsRef = useRef<PixiPoints[]>([])

  useEffect(() => {
    const pixiPointsArray = pixiPointsRef.current
    const initialPixiPoints = addInitialPixiPoints ? new PixiPoints() : undefined
    initialPixiPoints && pixiPointsArray.push(initialPixiPoints)
    return () => {
      // if we created it, we destroy it
      initialPixiPoints?.dispose()
      pixiPointsArray.length = 0
    }
  }, [addInitialPixiPoints])

  return pixiPointsRef
}
