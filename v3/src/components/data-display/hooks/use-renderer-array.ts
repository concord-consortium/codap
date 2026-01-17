import { useCallback, useEffect, useState } from "react"
import { NullPointRenderer, PointRendererBase, PointRendererArray } from "../renderer"

interface IProps {
  addInitialRenderer?: boolean
}

/**
 * Hook for managing an array of point renderers.
 * Used by maps where each layer creates its own renderer.
 *
 * Note: This hook creates NullPointRenderer instances as placeholders.
 * For proper WebGL context management, each layer should create its own
 * PixiPointRenderer and register it via setRendererLayer.
 */
export function useRendererArray(props?: IProps) {
  const { addInitialRenderer = false } = props || {}
  const [rendererArray, setRendererArray] = useState<PointRendererArray>([])

  useEffect(() => {
    let initialRenderer: PointRendererBase | undefined

    async function initRenderer() {
      if (addInitialRenderer) {
        // Create a NullPointRenderer as placeholder - actual rendering happens in layers
        initialRenderer = new NullPointRenderer()
        await initialRenderer.init()
        setRendererArray([initialRenderer])
      }
    }
    initRenderer()

    return () => {
      // if we created it, we destroy it
      initialRenderer?.dispose()
      setRendererArray([])
    }
  }, [addInitialRenderer])

  const setRendererLayer = useCallback((renderer: PointRendererBase, layerIndex: number) => {
    setRendererArray((prev) => {
      const newArray = [...prev]
      newArray[layerIndex] = renderer
      return newArray
    })
  }, [])

  return { rendererArray, setRendererLayer }
}
