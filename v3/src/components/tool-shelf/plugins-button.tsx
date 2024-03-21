import React from "react"
import { Menu, MenuButton, MenuItem, MenuList, Tag } from "@chakra-ui/react"
import PluginsIcon from '../../assets/icons/icon-plug.svg'
import { useDocumentContent } from "../../hooks/use-document-content"
import { t } from "../../utilities/translation/translate"
import { kWebViewTileType } from "../web-view/web-view-defs"
import { IWebViewModel } from "../web-view/web-view-model"

export function PluginsButton() {
  const documentContent = useDocumentContent()

  function handleTileButtonClick(url: string) {
    documentContent?.applyUndoableAction(() => {
      // TODO v2 eliminates the undo history when you add a plugin
      const tile = documentContent?.createOrShowTile?.(kWebViewTileType)
      if (tile) (tile.content as IWebViewModel).setUrl(url)
    }, "", "")
  }

  return (
    <Menu isLazy>
      <MenuButton
        className="tool-shelf-button menu plugins"
        title={t("DG.ToolButtonData.optionMenu.toolTip")}
        data-testid="tool-shelf-button-plugins"
      >
        <PluginsIcon />
        <Tag className="tool-shelf-tool-label">{t("DG.ToolButtonData.pluginMenu.title")}</Tag>
      </MenuButton>
      <MenuList>
        <MenuItem
          data-testid="tool-shelf-plugins-option"
          onClick={() => handleTileButtonClick("https://www.wikipedia.org")}
        >
          <PluginsIcon />Sampler
        </MenuItem>
      </MenuList>
    </Menu>
  )
}
