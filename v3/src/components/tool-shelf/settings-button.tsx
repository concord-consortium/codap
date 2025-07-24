import React, { useState } from "react"
import { clsx } from "clsx"
import { Menu, MenuButton, MenuItem, MenuList, useDisclosure } from "@chakra-ui/react"
import { useDocumentContent } from "../../hooks/use-document-content"
import { getSpecialLangFontClassName } from "../../utilities/translation/languages"
import { gLocale } from "../../utilities/translation/locale"
import { t } from "../../utilities/translation/translate"
import { WebViewUrlModal } from "../web-view/web-view-url-modal"
import { ToolShelfButtonTag } from "./tool-shelf-button"
import { showWebView } from "./tool-shelf-utilities"
import WebViewIcon from "../../assets/icons/icon-media-tool.svg"
import ToolbarPositionIcon from "../../assets/icons/icon-toolbar-position.svg"
import OptionsIcon from "../../assets/icons/icon-settings.svg"

import "./tool-shelf.scss"

export const SettingsShelfButton = () => {
  const documentContent = useDocumentContent()
  const { isOpen, onClose, onOpen } = useDisclosure()
  const langClass = getSpecialLangFontClassName(gLocale.current)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  //TODO: May have to move state somewhere
  const [ positionToolShelf, setPositionToolShelf ] = useState<"Top" | "Left">("Top")

  const handleSetWebViewUrlAccept = (url: string) => {
    showWebView(url, documentContent)
  }

  const toggleToolShelfPosition = () => {
    const newPosition = positionToolShelf === "Top" ? "Left" : "Top"
    setPositionToolShelf(newPosition)
    setIsMenuOpen(false)
    //TODO: actually change the position of the tool shelf
  }

  const handleShowWebViewModal = () => {
    onOpen();
    setIsMenuOpen(false)
  }

  return (
    <>
      <Menu isLazy autoSelect={false} onClose={()=>setIsMenuOpen(false)}>
        <MenuButton
          className={clsx("tool-shelf-button", "tool-shelf-menu", "web-view", langClass, {"menu-open": isMenuOpen})}
          title={t("DG.ToolButtonData.optionMenu.toolTip")}
          data-testid="tool-shelf-button-options" onClick={()=>setIsMenuOpen(!isMenuOpen)}
        >
          <OptionsIcon />
          <ToolShelfButtonTag
            className="tool-shelf-tool-label web-view"
            label={t("DG.ToolButtonData.optionMenu.title")}
          />
        </MenuButton>
        <MenuList className="tool-shelf-menu-list settings" data-testid="tool-shelf-settings-menu-list">
          <MenuItem data-testid="tool-shelf-button-web-view" onClick={handleShowWebViewModal}
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
