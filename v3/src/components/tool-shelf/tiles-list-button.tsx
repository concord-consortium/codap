import { Menu, MenuButton, MenuItem, MenuList, useDisclosure } from "@chakra-ui/react"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import WebViewIcon from "../../assets/icons/icon-media-tool.svg"
import TileListIcon from "../../assets/icons/icon-tile-list.svg"
import { useDocumentContent } from "../../hooks/use-document-content"
import { isFreeTileLayout, isFreeTileRow } from "../../models/document/free-tile-row"
import { persistentState } from "../../models/persistent-state"
import { getTileComponentIcon } from "../../models/tiles/tile-component-info"
import { getTileContentInfo } from "../../models/tiles/tile-content-info"
import { ITileModel } from "../../models/tiles/tile-model"
import { uiState } from "../../models/ui-state"
import { getSpecialLangFontClassName, t } from "../../utilities/translation/translate"
import { ToolShelfButtonTag } from "./tool-shelf-button"
import { handleSelectTile } from "./tool-shelf-utilities"

import "./tool-shelf.scss"

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
  const {isOpen, onOpen, onClose} = useDisclosure()

  const handleFocus = (tileId: string) => {
    uiState.setHoveredTile(tileId)
    uiState.setFocusedTile(tileId)
  }

  const handleBlur = () => {
    uiState.setHoveredTile("")
    uiState.setFocusedTile("")
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
          {tilesArr?.filter(tile => !isTileHidden(tile)).map((tile) => {
            const tileType = tile.content.type
            const _Icon = getTileComponentIcon(tileType)
            const Icon = _Icon ?? WebViewIcon
            const iconClass = _Icon ? tileType : "WebView"
            const tileInfo = getTileContentInfo(tileType)
            const title = tileInfo?.getTitle(tile)
            return (
              <MenuItem key={tile?.id} data-testid="tiles-list-menu-item" className="tool-shelf-menu-item"
                  onClick={()=>handleSelectTile(tile.id, documentContent) }
                  onFocus={()=>handleFocus(tile.id)} // Handle focus similar to pointer over
                  onBlur={()=>handleBlur()} // Handle blur similar to pointer leave
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
