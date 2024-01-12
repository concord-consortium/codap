import React from "react"
import { Menu, MenuButton, MenuItem, MenuList, Tag } from "@chakra-ui/react"
import t from "../../utilities/translation/translate"
import OptionsIcon from "../../assets/icons/icon-options.svg"

import "./tool-shelf.scss"

export const OptionsShelfButton = () => {
  return (
    <Menu isLazy>
      <MenuButton
        className="tool-shelf-button menu web-view"
        title={t("DG.ToolButtonData.optionMenu.title")}
        data-testid={"tool-shelf-button-web-view"}
      >
        <OptionsIcon />
        <Tag className="tool-shelf-tool-label web-view">{t("DG.ToolButtonData.optionMenu.title")}</Tag>
      </MenuButton>
      <MenuList>
        <MenuItem data-testid="tool-shelf-table-new-clipboard">
          {t("DG.AppController.optionMenuItems.viewWebPage")}
        </MenuItem>
      </MenuList>
    </Menu>
  )
}
