import React from "react"
import { Menu, MenuButton, MenuItem, MenuList, Tag } from "@chakra-ui/react"
import PluginsIcon from '../../assets/icons/icon-plug.svg'
import { t } from "../../utilities/translation/translate"

export function PluginsButton() {
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
        <MenuItem data-testid="tool-shelf-plugins-option" onClick={() => console.log(`selected`)}>
          Sampler
        </MenuItem>
      </MenuList>
    </Menu>
  )
}
