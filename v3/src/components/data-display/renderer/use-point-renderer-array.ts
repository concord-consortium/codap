import React, { useCallback, useContext, useEffect, useMemo, useState } from "react"
import { PointRendererBase } from "./point-renderer-base"
import { IPointRendererOptions, RendererCapability } from "./point-renderer-types"
import { usePointRenderer } from "./use-point-renderer"

/**
 * Context for sharing renderer settings with child layers.
 * This allows layers to create their own context-managed renderers
 * while sharing the parent's visibility and priority settings.
 */
export interface IPointRendererArrayContextValue {
  baseId: string
  isMinimized?: boolean
  priority?: number
  containerRef?: React.RefObject<HTMLElement>
  setRendererLayer: (renderer: PointRendererBase, layerIndex: number) => void
}

export const PointRendererArrayContext = React.createContext<IPointRendererArrayContextValue | null>(null)

/**
 * Hook to access the renderer array context.
 * Returns null if not within a PointRendererArrayContext provider.
 */
export function usePointRendererArrayContext(): IPointRendererArrayContextValue | null {
  return useContext(PointRendererArrayContext)
}

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

  /**
   * The type of the primary renderer ("webgl", "canvas", or "null")
   */
  primaryRendererType: RendererCapability

  /**
   * Context value for child layers to use.
   * Wrap child components in PointRendererArrayContext.Provider with this value.
   */
  contextValue: IPointRendererArrayContextValue
}

/**
 * Hook for managing an array of point renderers (multi-layer support)
 */
export function usePointRendererArray(options: IUsePointRendererArrayOptions): IUsePointRendererArrayResult {
  const { baseId, isMinimized, priority, containerRef, addInitialRenderer = false } = options

  const [rendererArray, setRendererArray] = useState<Array<PointRendererBase | undefined>>([])

  // Use single renderer hook for the initial/primary renderer (only when addInitialRenderer is true)
  // When addInitialRenderer is false (e.g., for maps), child components create their own renderers
  // via useLayerRenderer, so we don't want to consume a WebGL context slot for an unused renderer.
  const primaryResult = usePointRenderer({
    id: `${baseId}-0`,
    isMinimized,
    priority,
    containerRef,
    // Skip registration with context manager when we won't use this renderer
    skipContextRegistration: !addInitialRenderer
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

  // Context value for child layers
  const contextValue = useMemo<IPointRendererArrayContextValue>(() => ({
    baseId,
    isMinimized,
    priority,
    containerRef,
    setRendererLayer
  }), [baseId, isMinimized, priority, containerRef, setRendererLayer])

  return {
    rendererArray,
    setRendererLayer,
    hasAnyWebGLContext,
    contextWasDenied: primaryResult.contextWasDenied,
    isVisible: primaryResult.isVisible,
    requestContextWithHighPriority: primaryResult.requestContextWithHighPriority,
    primaryRendererType: primaryResult.rendererType,
    contextValue
  }
}

/**
 * Options for the useLayerRenderer hook
 */
export interface IUseLayerRendererOptions {
  /**
   * Optional priority override for this specific layer
   */
  layerPriority?: number

  /**
   * Options to pass to the renderer's init() method.
   * Used for layer-specific options like backgroundEventDistribution for maps.
   */
  rendererOptions?: IPointRendererOptions
}

/**
 * Result from useLayerRenderer hook
 */
export interface IUseLayerRendererResult {
  renderer: PointRendererBase | undefined
  isReady: boolean
  hasWebGLContext: boolean
}

/**
 * Hook for child layers to get a context-managed renderer.
 * Must be used within a PointRendererArrayContext.Provider.
 *
 * This hook:
 * - Creates a renderer using usePointRenderer with shared settings from context
 * - Automatically registers the renderer with the parent via setRendererLayer
 * - Participates in WebGL context management
 *
 * @param layerIndex - The index of this layer in the renderer array
 * @param options - Optional configuration for this layer's renderer
 */
export function useLayerRenderer(layerIndex: number, options?: IUseLayerRendererOptions): IUseLayerRendererResult {
  const context = useContext(PointRendererArrayContext)

  if (!context) {
    throw new Error("useLayerRenderer must be used within a PointRendererArrayContext.Provider")
  }

  const { baseId, isMinimized, priority, containerRef, setRendererLayer } = context
  const { layerPriority, rendererOptions } = options ?? {}

  // Create a context-managed renderer for this layer
  const { renderer, isReady, hasWebGLContext } = usePointRenderer({
    id: `${baseId}-layer-${layerIndex}`,
    isMinimized,
    priority: layerPriority ?? priority,
    containerRef,
    rendererOptions
  })

  // Register the renderer with the parent when it changes
  useEffect(() => {
    if (renderer) {
      setRendererLayer(renderer, layerIndex)
    }
  }, [renderer, layerIndex, setRendererLayer])

  return { renderer, isReady, hasWebGLContext }
}
