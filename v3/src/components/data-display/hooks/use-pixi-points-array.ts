import { useCallback, useEffect, useState } from "react"
import { PixiPoints } from "../pixi/pixi-points"
import { PixiPointsCompatible, PixiPointsCompatibleArray } from "../renderer"

interface IProps {
  addInitialPixiPoints?: boolean
}

export function usePixiPointsArray(props?: IProps) {
  const { addInitialPixiPoints = false } = props || {}
  const [ pixiPointsArray, setPixiPointsArray ] = useState<PixiPointsCompatibleArray>([])

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

  const setPixiPointsLayer = useCallback((pixiPoints: PixiPointsCompatible, layerIndex: number) => {
    setPixiPointsArray((prev) => {
      const newPixiPointsArray = [...prev]
      newPixiPointsArray[layerIndex] = pixiPoints
      return newPixiPointsArray
    })
  }, [])

  return {pixiPointsArray, setPixiPointsLayer}
}
