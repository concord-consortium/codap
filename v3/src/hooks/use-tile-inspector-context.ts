import { createContext, useContext } from "react"

export class TileInspectorContent {
  // tile-specific derived classes should extend this class
}

// mirrors useState return type
export type TileInspectorContextType = [TileInspectorContent, (content: TileInspectorContent) => void]

// This context facilitates communication between a tile and its inspector panel.
const defaultContext: TileInspectorContextType = [new TileInspectorContent(), () => {}]
export const TileInspectorContext = createContext<TileInspectorContextType>(defaultContext)

export function useTileInspectorContext() {
  return useContext(TileInspectorContext)
}
