import React, { useState } from "react"
import { Menu, MenuButton, MenuItem, MenuList, useDisclosure } from "@chakra-ui/react"
import OptionsIcon from "../../assets/icons/icon-settings.svg"
import { useDocumentContent } from "../../hooks/use-document-content"
import { t } from "../../utilities/translation/translate"
import { WebViewUrlModal } from "../web-view/web-view-url-modal"
import { ToolShelfButtonTag } from "./tool-shelf-button"
import { showWebView } from "./tool-shelf-utilities"
import WebViewIcon from "../../assets/icons/icon-media-tool.svg"
import ToolbarPositionIcon from "../../assets/icons/icon-toolbar-position.svg"

import "./tool-shelf.scss"

export const SettingsShelfButton = () => {
  const documentContent = useDocumentContent()
  const { isOpen, onClose, onOpen } = useDisclosure()
  //TODO: May have to move state somewhere
  const [ positionToolShelf, setPositionToolShelf ] = useState<"Top" | "Left">("Top")

  const handleSetWebViewUrlAccept = (url: string) => {
    showWebView(url, documentContent)
  }

  const toggleToolShelfPosition = () => {
    const newPosition = positionToolShelf === "Top" ? "Left" : "Top"
    setPositionToolShelf(newPosition)
    //TODO: actually change the position of the tool shelf
  }

  return (
    <>
      <Menu isLazy autoSelect={false}>
        <MenuButton
          className="tool-shelf-button tool-shelf-menu web-view"
          title={t("DG.ToolButtonData.optionMenu.toolTip")}
          data-testid="tool-shelf-button-options"
        >
          <OptionsIcon />
          <ToolShelfButtonTag
            className="tool-shelf-tool-label web-view"
            label={t("DG.ToolButtonData.optionMenu.title")}
          />
        </MenuButton>
        <MenuList className="tool-shelf-menu-list settings" data-testid="tool-shelf-settings-menu-list">
          <MenuItem data-testid="tool-shelf-button-web-view" onClick={onOpen}
              className="tool-shelf-menu-item settings">
            <WebViewIcon className="menu-icon web-view-icon" />
            {t("DG.AppController.optionMenuItems.viewWebPage")}
          </MenuItem>
          <MenuItem data-testid="tool-shelf-button-tool-shelf-position" onClick={toggleToolShelfPosition}
              className="tool-shelf-menu-item settings">
            <ToolbarPositionIcon className="menu-icon toolbar-position-icon" />
            {t("DG.AppController.optionMenuItems.positionToolShelf")} {positionToolShelf}
          </MenuItem>
        </MenuList>
      </Menu>
      { isOpen &&
        <WebViewUrlModal
          isOpen={isOpen}
          onAccept={handleSetWebViewUrlAccept}
          onClose={onClose}
        />
      }
    </>
  )
}
