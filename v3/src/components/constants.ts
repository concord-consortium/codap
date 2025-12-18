export const defaultFontStack = "Lato, sans-serif"
export const defaultFontSize = "14px"

export const defaultFont = `${defaultFontSize} ${defaultFontStack}`
export const defaultBoldFont = `bold ${defaultFont}`
export const defaultItalicFont = `italic ${defaultFont}`

export const defaultTileTitleFont = defaultItalicFont

// Send to back (use 0 instead of negative to maintain click handling)
export const kStandaloneZIndex = 0

export const kTitleBarHeight = 34
export const kResizeBorderOverlap = 2
export const kResizeBorderSize = 8
export const kResizeHandleSize = 22
export const kTileDragGridSize = 5

export const kDefaultTileWidth = 250
export const kDefaultTileHeight = 250

export const kCodapAppElementId = "codap-app-id"
export const kCodapTileContainerClass = "free-tile-container"
export const kCodapTileClass = "free-tile-component"
export const kStandaloneTileClass = "codap-standalone-component"
export const kUserEntryDropOverlay = "user-entry-drop-overlay"

export interface IChangingTileStyle {
  left: number
  top: number
  width?: number
  height?: number
  zIndex?: number
  transition: string
}
