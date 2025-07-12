import React, { useState } from "react"
import { Menu, MenuButton, MenuItem, MenuList, useDisclosure } from "@chakra-ui/react"
import OptionsIcon from "../../assets/icons/icon-settings.svg"
import { useDocumentContent } from "../../hooks/use-document-content"
import { t } from "../../utilities/translation/translate"
import { WebViewUrlModal } from "../web-view/web-view-url-modal"
import { kRightButtonBackground, ToolShelfButtonTag } from "./tool-shelf-button"
import { showWebView } from "./tool-shelf-utilities"

import "./tool-shelf.scss"

export const OptionsShelfButton = () => {
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
      <Menu isLazy>
        <MenuButton
          className="tool-shelf-button toolshelf-menu web-view"
          title={t("DG.ToolButtonData.optionMenu.toolTip")}
          data-testid="tool-shelf-button-options"
        >
          <OptionsIcon />
          <ToolShelfButtonTag
            bg={kRightButtonBackground}
            className="web-view"
            label={t("DG.ToolButtonData.optionMenu.title")}
          />
        </MenuButton>
        <MenuList>
          <MenuItem data-testid="tool-shelf-button-web-view" onClick={onOpen}>
            {t("DG.AppController.optionMenuItems.viewWebPage")}
          </MenuItem>
          <MenuItem data-testid="tool-shelf-button-tool-shelf-position" onClick={toggleToolShelfPosition}>
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
