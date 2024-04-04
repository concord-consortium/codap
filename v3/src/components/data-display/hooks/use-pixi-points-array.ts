import { useEffect, useRef } from "react"
import { PixiPoints } from "../../graph/utilities/pixi-points"

interface IProps {
  addInitialPixiPoints?: boolean
}

export function usePixiPointsArray(props?: IProps) {
  const { addInitialPixiPoints = false } = props || {}
  const pixiPointsRef = useRef<PixiPoints[]>([])

  useEffect(() => {
    const pixiPointsArray = pixiPointsRef.current
    if (addInitialPixiPoints) {
      pixiPointsArray.push(new PixiPoints())
    }
    return () => {
      pixiPointsArray.forEach(pixiPoints => pixiPoints.dispose())
      pixiPointsArray.length = 0
    }
  }, [addInitialPixiPoints])

  return pixiPointsRef
}
