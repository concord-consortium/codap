import { createContext, useContext } from "react"

export class TileInspectorContent {
  // tile-specific derived classes should extend this class
}

// mirrors useState signature
export type TileInspectorContextType = [TileInspectorContent, (content: TileInspectorContent) => void]

const defaultContext: TileInspectorContextType = [new TileInspectorContent(), () => {}]
export const TileInspectorContext = createContext<TileInspectorContextType>(defaultContext)

export function useTileInspectorContext() {
  return useContext(TileInspectorContext)
}
