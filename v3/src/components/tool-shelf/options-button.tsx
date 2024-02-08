import React from "react"
import { Menu, MenuButton, MenuItem, MenuList, Tag } from "@chakra-ui/react"
import OptionsIcon from "../../assets/icons/icon-options.svg"
import { IDocumentModel } from "../../models/document/document"
import t from "../../utilities/translation/translate"
import { kWebViewTileType } from "../web-view/web-view-defs"

import "./tool-shelf.scss"

interface IProps {
  document?: IDocumentModel
}
export const OptionsShelfButton = ({ document }: IProps) => {
  const createWebView = () => {
    document?.content?.applyUndoableAction(() => {
      document?.content?.createOrShowTile?.(kWebViewTileType)
    }, "DG.Undo.", "DG.Redo.")
  };
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
        <MenuItem data-testid="tool-shelf-table-new-clipboard" onClick={createWebView}>
          {t("DG.AppController.optionMenuItems.viewWebPage")}
        </MenuItem>
      </MenuList>
    </Menu>
  )
}
