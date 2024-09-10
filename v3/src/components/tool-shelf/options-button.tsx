import React from "react"
import { Menu, MenuButton, MenuItem, MenuList, useDisclosure } from "@chakra-ui/react"
import OptionsIcon from "../../assets/icons/icon-options.svg"
import { useDocumentContent } from "../../hooks/use-document-content"
import { t } from "../../utilities/translation/translate"
import { kWebViewTileType } from "../web-view/web-view-defs"
import { isWebViewModel } from "../web-view/web-view-model"
import { WebViewUrlModal } from "../web-view/web-view-url-modal"
import { kRightButtonBackground, ToolShelfButtonTag } from "./tool-shelf-button"
import { logMessageWithReplacement } from "../../lib/log-message"

import "./tool-shelf.scss"

export const OptionsShelfButton = () => {
  const documentContent = useDocumentContent()
  const webViewModal = useDisclosure()

  const handleSetWebViewUrlOpen = () => {
    webViewModal.onOpen()
  }

  const handleSetWebViewUrlClose = () => {
    webViewModal.onClose()
  }

  const handleSetWebViewUrlAccept = (url: string) => {
    documentContent?.applyModelChange(() => {
      const tile = documentContent?.createOrShowTile?.(kWebViewTileType)
      isWebViewModel(tile?.content) && tile?.content.setUrl(url)
    }, {
      undoStringKey: "V3.Undo.webView.show",
      redoStringKey: "V3.Redo.webView.show",
      log: logMessageWithReplacement("Show web view: %@", {url, category: "document"})
    })
  }
  return (
    <>
      <Menu isLazy>
        <MenuButton
          className="tool-shelf-button web-view"
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
          <MenuItem data-testid="tool-shelf-button-web-view" onClick={handleSetWebViewUrlOpen}>
            {t("DG.AppController.optionMenuItems.viewWebPage")}
          </MenuItem>
        </MenuList>
      </Menu>
      { webViewModal.isOpen &&
        <WebViewUrlModal
          isOpen={webViewModal.isOpen}
          onAccept={handleSetWebViewUrlAccept}
          onClose={handleSetWebViewUrlClose}
        />
      }
    </>
  )
}
