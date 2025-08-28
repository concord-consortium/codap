import React from "react"
import { observer } from "mobx-react-lite"
import { clsx } from "clsx"
import { Menu, MenuButton, MenuItem, MenuList, useDisclosure } from "@chakra-ui/react"
import { useDocumentContent } from "../../hooks/use-document-content"
import { persistentState } from "../../models/persistent-state"
import { uiState } from "../../models/ui-state"
import { isFreeTileLayout } from "../../models/document/free-tile-row"
import { getSpecialLangFontClassName, t } from "../../utilities/translation/translate"
import { ToolShelfButtonTag } from "./tool-shelf-button"
import { getTileComponentIcon } from "../../models/tiles/tile-component-info"
import { getTileContentInfo } from "../../models/tiles/tile-content-info"
import WebViewIcon from "../../assets/icons/icon-media-tool.svg"
import TileListIcon from "../../assets/icons/icon-tile-list.svg"

import "./tool-shelf.scss"

export const TilesListShelfButton = observer(function TilesListShelfButton() {
  const documentContent = useDocumentContent()
  const tilesArr = documentContent?.tileMap ? Array.from(documentContent.tileMap.values()) : []
  const langClass = getSpecialLangFontClassName()
  const {isOpen, onOpen, onClose} = useDisclosure()

  const handleSelectTile = (tileId: string) => {
    uiState.setFocusedTile(tileId)
    const tileRow = documentContent?.findRowContainingTile(tileId)
    const tileLayout = tileRow?.getTileLayout(tileId)
    isFreeTileLayout(tileLayout) && tileLayout.setMinimized(false)
  }

  const handleFocus = (tileId: string) => {
    uiState.setHoveredTile(tileId)
  }

  const handleBlur = (tileId: string) => {
    uiState.setHoveredTile("")
  }

  const placement = persistentState.toolbarPosition === "Top" ? "bottom-end" : "right-end"
  return (
    <>
      <Menu isLazy autoSelect={false} isOpen={isOpen} onOpen={onOpen} onClose={onClose} placement={placement}>
        <MenuButton
          className={clsx("tool-shelf-button", "tool-shelf-menu", "tiles-list-menu", langClass, {"menu-open": isOpen})}
          title={t("DG.ToolButtonData.tileListMenu.toolTip")}
          data-testid="tool-shelf-button-tiles"
        >
          <TileListIcon />
          <ToolShelfButtonTag
            className="tool-shelf-tool-label tiles-list"
            label={t("DG.ToolButtonData.tileListMenu.title")}
          />
        </MenuButton>
        <MenuList className="tool-shelf-menu-list top-menu tiles-list" data-testid="tiles-list-menu" >
          {tilesArr?.map((tile) => {
            const tileType = tile.content.type
            const _Icon = getTileComponentIcon(tileType)
            const Icon = _Icon ?? WebViewIcon
            const iconClass = _Icon ? tileType : "WebView"
            const tileInfo = getTileContentInfo(tileType)
            const title = tileInfo?.getTitle(tile)
            return (
              <MenuItem key={tile?.id} data-testid="tiles-list-menu-item" className="tool-shelf-menu-item"
                  onClick={()=>handleSelectTile(tile.id) }
                  onFocus={()=>handleFocus(tile.id)} // Handle focus similar to pointer over
                  onBlur={()=>handleBlur(tile.id)} // Handle blur similar to pointer leave
              >
                <Icon className={`menu-icon ${iconClass}`} data-testid="tile-list-menu-icon"/>
                {title}
              </MenuItem>
            )
          })}
        </MenuList>
      </Menu>
    </>
  )
})
