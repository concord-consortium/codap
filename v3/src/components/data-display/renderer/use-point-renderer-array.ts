import { useCallback, useEffect, useMemo, useState } from "react"
import { PointRendererBase } from "./point-renderer-base"
import { usePointRenderer } from "./use-point-renderer"

/**
 * Options for the usePointRendererArray hook
 */
export interface IUsePointRendererArrayOptions {
  /**
   * Base ID for the renderers (will be suffixed with layer index)
   */
  baseId: string

  /**
   * Whether the component is minimized
   */
  isMinimized?: boolean

  /**
   * Priority for WebGL context allocation
   */
  priority?: number

  /**
   * Container element to observe for visibility
   */
  containerRef?: React.RefObject<HTMLElement>

  /**
   * Whether to add an initial renderer
   */
  addInitialRenderer?: boolean
}

export interface IUsePointRendererArrayResult {
  /**
   * Array of renderers
   */
  rendererArray: Array<PointRendererBase | undefined>

  /**
   * Set a renderer at a specific layer index
   */
  setRendererLayer: (renderer: PointRendererBase, layerIndex: number) => void

  /**
   * Whether any renderer has a WebGL context
   */
  hasAnyWebGLContext: boolean

  /**
   * Whether a context was requested and denied.
   * Use this for showing placeholder messages without flashing during initial render.
   */
  contextWasDenied: boolean

  /**
   * Whether the renderers are visible
   */
  isVisible: boolean

  /**
   * Request a WebGL context with boosted priority.
   * Call this when user interacts with a graph that doesn't have a context.
   */
  requestContextWithHighPriority: () => void
}

/**
 * Hook for managing an array of point renderers (multi-layer support)
 */
export function usePointRendererArray(options: IUsePointRendererArrayOptions): IUsePointRendererArrayResult {
  const { baseId, isMinimized, priority, containerRef, addInitialRenderer = false } = options

  const [rendererArray, setRendererArray] = useState<Array<PointRendererBase | undefined>>([])

  // Use single renderer hook for the initial/primary renderer
  const primaryResult = usePointRenderer({
    id: `${baseId}-0`,
    isMinimized,
    priority,
    containerRef
  })

  // Initialize with primary renderer if requested
  useEffect(() => {
    if (addInitialRenderer && primaryResult.isReady) {
      setRendererArray([primaryResult.renderer])
    }
  }, [addInitialRenderer, primaryResult.isReady, primaryResult.renderer])

  const setRendererLayer = useCallback((renderer: PointRendererBase, layerIndex: number) => {
    setRendererArray(prev => {
      const newArray = [...prev]
      newArray[layerIndex] = renderer
      return newArray
    })
  }, [])

  const hasAnyWebGLContext = useMemo(() => {
    return rendererArray.some(r => r?.capability === "webgl")
  }, [rendererArray])

  return {
    rendererArray,
    setRendererLayer,
    hasAnyWebGLContext,
    contextWasDenied: primaryResult.contextWasDenied,
    isVisible: primaryResult.isVisible,
    requestContextWithHighPriority: primaryResult.requestContextWithHighPriority
  }
}
