import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { NullPointRenderer } from "./null-point-renderer"
import { PixiPointRenderer } from "./pixi-point-renderer"
import { PointRendererBase } from "./point-renderer-base"
import { IPointRendererOptions } from "./point-renderer-types"
import { PointsState } from "./points-state"
import { IContextConsumer, webGLContextManager } from "./webgl-context-manager"

/**
 * Options for the usePointRenderer hook
 */
export interface IUsePointRendererOptions {
  /**
   * Unique identifier for this renderer instance (e.g., tile ID)
   */
  id: string

  /**
   * Whether the component is minimized
   */
  isMinimized?: boolean

  /**
   * Priority for WebGL context allocation (typically point count)
   * Higher values = higher priority
   */
  priority?: number

  /**
   * Container element to observe for visibility changes
   * If not provided, visibility observation is disabled
   */
  containerRef?: React.RefObject<HTMLElement>

  /**
   * Callback when the renderer type changes (e.g., null -> webgl)
   */
  onRendererChange?: (renderer: PointRendererBase) => void

  /**
   * Options to pass to the renderer's init() method.
   * Used for map-specific options like backgroundEventDistribution.
   */
  rendererOptions?: IPointRendererOptions

  /**
   * Skip registration with the WebGL context manager.
   * Use this when the renderer will not actually be used (e.g., the primary
   * renderer in usePointRendererArray when addInitialRenderer is false).
   */
  skipContextRegistration?: boolean
}

/**
 * Result of the usePointRenderer hook
 */
export interface IUsePointRendererResult {
  /**
   * The current renderer instance
   */
  renderer: PointRendererBase

  /**
   * Whether the renderer has a WebGL context
   */
  hasWebGLContext: boolean

  /**
   * Whether a context was requested and denied.
   * Use this instead of !hasWebGLContext for showing placeholder messages,
   * as it avoids flashing during initial render.
   */
  contextWasDenied: boolean

  /**
   * Whether the renderer is visible (not minimized, not scrolled off-screen)
   */
  isVisible: boolean

  /**
   * Whether the renderer is ready for use
   */
  isReady: boolean

  /**
   * The shared state that survives renderer switches
   */
  state: PointsState

  /**
   * Request a WebGL context with boosted priority.
   * Call this when user interacts with a graph that doesn't have a context.
   * This will bump the graph to the top of the priority queue.
   */
  requestContextWithHighPriority: () => void
}

/**
 * Hook that manages point renderer lifecycle, including:
 * - WebGL context allocation via WebGLContextManager
 * - Visibility observation via IntersectionObserver
 * - Renderer switching (NullPointRenderer <-> PixiPointRenderer)
 * - State preservation across renderer switches
 *
 * Usage:
 * ```
 * const { renderer, hasWebGLContext, isVisible, isReady, state } = usePointRenderer({
 *   id: tileId,
 *   isMinimized,
 *   priority: pointCount,
 *   containerRef
 * })
 * ```
 */
export function usePointRenderer(options: IUsePointRendererOptions): IUsePointRendererResult {
  const {
    id, isMinimized = false, priority = 0, containerRef, onRendererChange, rendererOptions,
    skipContextRegistration = false
  } = options

  // Shared state that survives renderer switches
  const stateRef = useRef<PointsState>(new PointsState())

  // Visibility state from IntersectionObserver
  const [isIntersecting, setIsIntersecting] = useState(true)

  // WebGL context state
  const [hasWebGLContext, setHasWebGLContext] = useState(false)

  // Track whether a context request was denied (for showing placeholder without flashing)
  const [contextWasDenied, setContextWasDenied] = useState(false)

  // Current renderer instance
  const [renderer, setRenderer] = useState<PointRendererBase>(() =>
    new NullPointRenderer(stateRef.current)
  )

  // Track if renderer is ready
  const [isReady, setIsReady] = useState(false)

  // Compute effective visibility
  const isVisible = useMemo(() => {
    return isIntersecting && !isMinimized
  }, [isIntersecting, isMinimized])

  // Context consumer callbacks
  const onContextGranted = useCallback(() => {
    setHasWebGLContext(true)
    setContextWasDenied(false)
  }, [])

  const onContextRevoked = useCallback(() => {
    setHasWebGLContext(false)
    // Context was taken away while we're visible - show placeholder
    setContextWasDenied(true)
  }, [])

  // Create context consumer object
  const contextConsumer = useMemo<IContextConsumer>(() => ({
    id,
    priority,
    onContextGranted,
    onContextRevoked
  }), [id, priority, onContextGranted, onContextRevoked])

  // Update priority when it changes
  useEffect(() => {
    if (!skipContextRegistration) {
      webGLContextManager.updatePriority(id, priority)
    }
  }, [id, priority, skipContextRegistration])

  // Set up IntersectionObserver for visibility
  useEffect(() => {
    const container = containerRef?.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          setIsIntersecting(entry.isIntersecting)
        })
      },
      {
        // Consider visible if any part is in viewport
        threshold: 0
      }
    )

    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [containerRef])

  // Request/yield WebGL context based on visibility
  useEffect(() => {
    // Skip context management if this renderer won't be used
    if (skipContextRegistration) {
      return
    }

    if (isVisible) {
      // Try to get a context when becoming visible
      const granted = webGLContextManager.requestContext(contextConsumer)
      if (granted) {
        setHasWebGLContext(true)
        setContextWasDenied(false)
      } else {
        // Context was requested but denied - show placeholder
        setContextWasDenied(true)
      }
    } else {
      // Yield context when not visible
      webGLContextManager.yieldContext(id)
      setHasWebGLContext(false)
      // Don't set contextWasDenied when yielding - we're not visible anyway
    }
  }, [isVisible, contextConsumer, id, skipContextRegistration])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (!skipContextRegistration) {
        webGLContextManager.releaseContext(id)
      }
      renderer.dispose()
    }
  // Note: We intentionally don't include `renderer` or `skipContextRegistration` in dependencies
  // because we want to dispose whatever renderer exists at unmount time
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Track if this is the first render to avoid disposing the initial renderer
  const isFirstRender = useRef(true)

  // Switch renderer based on WebGL context availability
  useEffect(() => {
    const switchRenderer = async () => {
      // Only dispose on subsequent renders, not on the first render
      // (because the initial renderer hasn't been init'd yet)
      if (!isFirstRender.current) {
        renderer.dispose()
      }
      isFirstRender.current = false

      let newRenderer: PointRendererBase

      if (hasWebGLContext) {
        newRenderer = new PixiPointRenderer(stateRef.current)
      } else {
        newRenderer = new NullPointRenderer(stateRef.current)
      }

      try {
        await newRenderer.init(rendererOptions)
      } catch (e) {
        console.error(`[usePointRenderer:${id}] renderer init FAILED`, e)
      }
      setRenderer(newRenderer)
      setIsReady(true)

      onRendererChange?.(newRenderer)
    }

    switchRenderer()
    // Note: We intentionally don't include `renderer` or `rendererOptions` in dependencies
    // as it would cause infinite loops or unnecessary re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasWebGLContext, onRendererChange])

  // Request a context with boosted priority (for user interaction)
  const requestContextWithHighPriority = useCallback(() => {
    if (skipContextRegistration || hasWebGLContext) {
      // Already have a context or not participating in context management
      return
    }
    // Get the next user interaction priority - each click gets a higher value
    // than the previous, ensuring the most recently clicked graph always wins
    const highPriority = webGLContextManager.getNextUserInteractionPriority()
    webGLContextManager.updatePriority(id, highPriority)

    // Request a context (this should now succeed due to high priority)
    const granted = webGLContextManager.requestContext({
      ...contextConsumer,
      priority: highPriority
    })
    if (granted) {
      setHasWebGLContext(true)
      setContextWasDenied(false)
    }
    // If not granted even with high priority, contextWasDenied should already be true
  }, [skipContextRegistration, hasWebGLContext, id, contextConsumer])

  return {
    renderer,
    hasWebGLContext,
    contextWasDenied,
    isVisible,
    isReady,
    state: stateRef.current,
    requestContextWithHighPriority
  }
}
