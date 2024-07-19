import React from "react"
import { observer } from "mobx-react-lite"
import { Menu, MenuButton, MenuItem, MenuList } from "@chakra-ui/react"
import OptionsIcon from "../../assets/icons/icon-options.svg"
import { useDocumentContent } from "../../hooks/use-document-content"
import { uiState } from "../../models/ui-state"
import { isFreeTileLayout } from "../../models/document/free-tile-row"
import { t } from "../../utilities/translation/translate"
import { kRightButtonBackground, ToolShelfButtonTag } from "./tool-shelf-button"
import { getTileComponentIcon } from "../../models/tiles/tile-component-info"
import { getTileContentInfo } from "../../models/tiles/tile-content-info"
import WebViewIcon from "../../assets/icons/icon-media-tool.svg"

import "./tool-shelf.scss"

export const TilesListShelfButton = observer(function TilesListShelfButton() {
  const documentContent = useDocumentContent()
  const tilesArr = documentContent?.tileMap ? Array.from(documentContent.tileMap.values()) : []

  const handleSelectTile = (tileId: string) => {
    uiState.setFocusedTile(tileId)
    const tileRow = documentContent?.findRowContainingTile(tileId)
    const tileLayout = tileRow?.getTileLayout(tileId)
    isFreeTileLayout(tileLayout) && tileLayout.setMinimized(false)
  }

  return (
    <>
      <Menu isLazy>
        <MenuButton
          className="tool-shelf-button tiles-list-menu"
          title={t("DG.ToolButtonData.tileListMenu.toolTip")}
          data-testid="tool-shelf-button-tiles"
        >
          <OptionsIcon />
          <ToolShelfButtonTag
            bg={kRightButtonBackground}
            className="tiles-list"
            label={t("DG.ToolButtonData.tileListMenu.title")}
          />
        </MenuButton>
        <MenuList data-testid="tiles-list-menu">
          {tilesArr?.map((tile) => {
            const tileType = tile?.content.type
            const Icon = getTileComponentIcon(tileType)
            const tileInfo = getTileContentInfo(tileType)
            const title = tileInfo?.getTitle(tile)
            return (
              <MenuItem key={tile?.id} data-testid="tiles-list-menu-item"
                  onClick={()=>handleSelectTile(tile.id)}>
                {(Icon && <Icon className={`tile-list-menu-icon ${tile.content.type}`}
                              data-testid="tile-list-menu-icon"/>) ||
                            <WebViewIcon className="tile-list-menu-icon WebView" data-testid="tile-list-menu-icon"/>}
                {title}
              </MenuItem>
            )
          })}
        </MenuList>
      </Menu>
    </>
  )
})
