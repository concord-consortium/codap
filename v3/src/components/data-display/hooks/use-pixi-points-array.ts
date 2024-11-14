import { useCallback, useEffect, useState } from "react"
import { PixiPoints, PixiPointsArray } from "../pixi/pixi-points"

interface IProps {
  addInitialPixiPoints?: boolean
}

export function usePixiPointsArray(props?: IProps) {
  const { addInitialPixiPoints = false } = props || {}
  const [ pixiPointsArray, setPixiPointsArray ] = useState<PixiPointsArray>([])

  useEffect(() => {
    const initialPixiPoints = addInitialPixiPoints ? new PixiPoints() : undefined

    async function initPixiPoints() {
      if (initialPixiPoints) {
        await initialPixiPoints.init()
        setPixiPointsArray([initialPixiPoints])
      }
    }
    initPixiPoints()

    return () => {
      // if we created it, we destroy it
      initialPixiPoints?.dispose()
      setPixiPointsArray([])
    }
  }, [addInitialPixiPoints])

  const setPixiPointsLayer = useCallback((pixiPoints: PixiPoints, layerIndex: number) => {
    setPixiPointsArray((prev) => {
      const newPixiPointsArray = [...prev]
      newPixiPointsArray[layerIndex] = pixiPoints
      return newPixiPointsArray
    })
  }, [])

  return {pixiPointsArray, setPixiPointsLayer}
}
