import { Menu, MenuButton, MenuItem, MenuList, useDisclosure } from "@chakra-ui/react"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { KeyboardEvent, useCallback, useEffect, useRef } from "react"
import WebViewIcon from "../../assets/icons/icon-media-tool.svg"
import PluginsIcon from "../../assets/icons/icon-plugins.svg"
import TileListIcon from "../../assets/icons/icon-tile-list.svg"
import { useDocumentContent } from "../../hooks/use-document-content"
import { useMenuItemScrollIntoView } from "../../hooks/use-menu-item-scroll-into-view"
import { focusTileContent } from "../../hooks/use-tile-navigation"
import { isFreeTileLayout, isFreeTileRow } from "../../models/document/free-tile-row"
import { persistentState } from "../../models/persistent-state"
import { getTileComponentIcon } from "../../models/tiles/tile-component-info"
import { getTileContentInfo, getTileTypeLabel } from "../../models/tiles/tile-content-info"
import { ITileModel } from "../../models/tiles/tile-model"
import { uiState } from "../../models/ui-state"
import { isWebViewModel } from "../web-view/web-view-model"
import { scrollTileIntoView } from "../../utilities/dom-utils"
import { getSpecialLangFontClassName, t } from "../../utilities/translation/translate"
import { ToolShelfButtonTag } from "./tool-shelf-button"
import { handleSelectTile } from "./tool-shelf-utilities"

import "./tool-shelf.scss"

const kScrollDebounceMs = 400

export function getShortcutKey(index: number): string | undefined {
  if (index < 9) return String(index + 1) // 1-9
  if (index === 9) return "0" // 0
  if (index < 36) return String.fromCharCode(97 + index - 10) // a-z
  return undefined
}

export const TilesListShelfButton = observer(function TilesListShelfButton() {
  const documentContent = useDocumentContent()
  const tilesArr = documentContent?.tileMap ? Array.from(documentContent.tileMap.values()) : []
  // assume the tile is in the first row, since CODAP currently only supports one row
  const container = documentContent?.rowMap.get(documentContent?.rowOrder[0])
  const freeTileContainer = isFreeTileRow(container) ? container : undefined
  const isTileHidden = (tile: ITileModel) => {
    if (uiState.isStandaloneTile(tile)) return true
    const tileLayout = freeTileContainer?.getTileLayout(tile.id)
    return isFreeTileLayout(tileLayout) ? tileLayout.isHidden : false
  }
  const langClass = getSpecialLangFontClassName()
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const focusTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const savedFocusTileRef = useRef<string>("")
  const selectedTileRef = useRef<string>("")
  const {isOpen, onOpen: _onOpen, onClose: _onClose} = useDisclosure()
  const handleMenuItemFocus = useMenuItemScrollIntoView()

  const clearScrollTimer = useCallback(() => {
    if (scrollTimerRef.current != null) {
      clearTimeout(scrollTimerRef.current)
      scrollTimerRef.current = undefined
    }
  }, [])

  const clearFocusTimer = useCallback(() => {
    if (focusTimerRef.current != null) {
      clearTimeout(focusTimerRef.current)
      focusTimerRef.current = undefined
    }
  }, [])

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      clearScrollTimer()
      clearFocusTimer()
    }
  }, [clearScrollTimer, clearFocusTimer])

  const onOpen = useCallback(() => {
    // Save and clear the currently focused tile so it doesn't compete visually with hover highlights.
    // Guard against double-fire (Chakra can call onOpen twice) — only save on the first call.
    if (!isOpen && !savedFocusTileRef.current) {
      savedFocusTileRef.current = uiState.focusedTile || "__none__"
      uiState.setFocusedTile("")
    }
    _onOpen()
  }, [isOpen, _onOpen])

  const onClose = useCallback(() => {
    clearScrollTimer()
    clearFocusTimer()
    const selected = selectedTileRef.current
    selectedTileRef.current = ""
    if (selected) {
      // A tile was selected from the menu
      savedFocusTileRef.current = ""
      uiState.setHoveredTile("")
      _onClose()
      // Chakra restores focus to MenuButton asynchronously (~50ms). After that settles,
      // re-trigger setFocusedTile so tile content (e.g. text editor) can claim focus,
      // and move DOM focus into the tile so keyboard navigation works immediately.
      focusTimerRef.current = setTimeout(() => {
        focusTimerRef.current = undefined
        uiState.setFocusedTile("")
        uiState.setFocusedTile(selected)
        focusTileContent(selected)
      }, 100)
    } else {
      // Menu was cancelled — restore the previously focused tile
      const saved = savedFocusTileRef.current
      savedFocusTileRef.current = ""
      if (saved && saved !== "__none__") {
        uiState.setFocusedTile(saved)
      }
      uiState.setHoveredTile("")
      _onClose()
    }
  }, [clearScrollTimer, clearFocusTimer, _onClose])

  const handleMenuSelectTile = (tileId: string) => {
    // Mark the tile as selected. handleSelectTile sets focus immediately (for show/unhide),
    // then onClose re-triggers setFocusedTile after Chakra's async cleanup settles.
    savedFocusTileRef.current = ""
    selectedTileRef.current = tileId
    handleSelectTile(tileId, documentContent)
  }

  const handleFocus = (tileId: string) => {
    uiState.setHoveredTile(tileId)
    // Debounce scroll so rapid arrow-key navigation doesn't cause jarring jumps.
    // Don't call setFocusedTile here — that would auto-focus text tile editors.
    clearScrollTimer()
    scrollTimerRef.current = setTimeout(() => scrollTileIntoView(tileId), kScrollDebounceMs)
  }

  const handleBlur = () => {
    uiState.setHoveredTile("")
    clearScrollTimer()
  }

  // Chakra v2 Menu only handles Escape when focus is on a menu item inside the MenuList,
  // not on the MenuButton. This handler closes the menu on Escape from the button.
  // (Not testable in Cypress due to framer-motion animation timing, but works for real users.)
  const handleMenuButtonKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape" && isOpen) {
      onClose()
    }
  }, [isOpen, onClose])

  // Compute display data for menu items: duplicate disambiguation, type labels, shortcut keys
  const visibleTiles = tilesArr.filter(tile => !isTileHidden(tile))
  const nameCounts = new Map<string, number>()
  const tileData = visibleTiles.map(tile => {
    const tileType = tile.content.type
    const tileInfo = getTileContentInfo(tileType)
    const title = tileInfo?.getTitle(tile) ?? ""
    const content = tile.content
    const isPlugin = isWebViewModel(content) && (content.isPlugin || content.isPluginCandidate)
    const typeLabel = getTileTypeLabel(isPlugin ? "Plugin" : tileType)
    const key = `${title}|||${typeLabel}`
    const count = (nameCounts.get(key) ?? 0) + 1
    nameCounts.set(key, count)
    return { tile, title, typeLabel, tileType, isPlugin, duplicateIndex: count }
  })

  const shortcutMap = new Map<string, string>()
  const displayItems = tileData.map((dt, index) => {
    const key = `${dt.title}|||${dt.typeLabel}`
    const total = nameCounts.get(key) ?? 1
    const suffix = total > 1 ? `(${dt.duplicateIndex})` : ""
    const displayTitle = [dt.title, suffix].filter(Boolean).join(" ")
    const shortcutKey = getShortcutKey(index)
    if (shortcutKey) shortcutMap.set(shortcutKey, dt.tile.id)
    return { ...dt, displayTitle, shortcutKey }
  })

  const handleMenuKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase()
    const tileId = shortcutMap.get(key)
    if (tileId) {
      e.preventDefault()
      e.stopPropagation()
      handleMenuSelectTile(tileId)
      onClose()
    }
  }

  const placement = persistentState.toolbarPosition === "Top" ? "bottom-end" : "right-end"
  return (
    <>
      <Menu isLazy isOpen={isOpen} onOpen={onOpen} onClose={onClose} placement={placement}>
        <MenuButton
          className={clsx("tool-shelf-button", "tool-shelf-menu", "tiles-list-menu", langClass, {"menu-open": isOpen})}
          aria-label={t("DG.ToolButtonData.tileListMenu.ariaLabel")}
          title={t("DG.ToolButtonData.tileListMenu.toolTip")}
          onKeyDown={handleMenuButtonKeyDown}
          data-action="tiles-menu"
          data-testid="tool-shelf-button-tiles"
        >
          <TileListIcon />
          <ToolShelfButtonTag
            className="tool-shelf-tool-label tiles-list"
            label={t("DG.ToolButtonData.tileListMenu.title")}
          />
        </MenuButton>
        <MenuList className="tool-shelf-menu-list top-menu tiles-list" data-testid="tiles-list-menu"
            onFocus={handleMenuItemFocus} onKeyDown={handleMenuKeyDown}>
          {displayItems.map((item) => {
            const { tile, tileType, isPlugin, displayTitle, typeLabel, shortcutKey } = item
            const _Icon = getTileComponentIcon(tileType)
            const Icon = isPlugin ? PluginsIcon : _Icon ?? WebViewIcon
            const iconClass = isPlugin ? "Plugin" : _Icon ? tileType : "WebView"
            return (
              <MenuItem key={tile.id} data-testid="tiles-list-menu-item" className="tool-shelf-menu-item"
                  onClick={()=>handleMenuSelectTile(tile.id) }
                  onFocus={()=>handleFocus(tile.id)} // Handle focus similar to pointer over
                  onBlur={()=>handleBlur()} // Handle blur similar to pointer leave
              >
                <Icon
                  aria-hidden="true"
                  className={`menu-icon ${iconClass}`}
                  data-testid="tile-list-menu-icon"
                />
                <span className="tile-menu-item-label">
                  {displayTitle ? `${displayTitle}, ${typeLabel}` : typeLabel}
                </span>
                {shortcutKey &&
                  <span className="tile-menu-shortcut-key" aria-label={`shortcut ${shortcutKey}`}>
                    {shortcutKey}
                  </span>
                }
              </MenuItem>
            )
          })}
        </MenuList>
      </Menu>
    </>
  )
})
