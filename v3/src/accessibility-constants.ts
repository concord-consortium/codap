// Focusable element selector — covers the standard set of natively and programmatically focusable elements.
// Used by focus traps and section/tile navigation to find focusable children.
export const kFocusableSelector =
  "a[href], area[href], input:not([disabled]), button:not([disabled]), select:not([disabled])," +
  " textarea:not([disabled]), [tabindex]:not([tabindex=\"-1\"])"

export const kTileAriaRole = "region"
export const kTileTitleBarAriaRole = "toolbar"
export const kInspectorPaletteAriaRole = "group"

// Keyboard shortcut keys (tinykeys format)
export const kSectionNextShortcut = "Control+."
export const kSectionPrevShortcut = "Shift+Control+."
export const kTileNextShortcut = "Control+;"
export const kTilePrevShortcut = "Shift+Control+;"
export const kTileInspectorToggleShortcut = "Control+\\"
export const kTilesMenuShortcut = "Control+'"
