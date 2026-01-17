import { createContext, useContext } from "react"
import { PointRendererBase } from "./point-renderer-base"

/**
 * Context for accessing the point renderer in the component tree.
 * This allows child components to access the renderer without prop drilling.
 */
export const PointRendererContext = createContext<PointRendererBase | undefined>(undefined)

/**
 * Hook to access the point renderer from context.
 * Throws an error if used outside of a PointRendererContext provider.
 */
export function usePointRendererContext(): PointRendererBase {
  const renderer = useContext(PointRendererContext)
  if (!renderer) {
    throw new Error("usePointRendererContext must be used within a PointRendererContext.Provider")
  }
  return renderer
}

/**
 * Hook to optionally access the point renderer from context.
 * Returns undefined if used outside of a PointRendererContext provider.
 */
export function useOptionalPointRendererContext(): PointRendererBase | undefined {
  return useContext(PointRendererContext)
}
