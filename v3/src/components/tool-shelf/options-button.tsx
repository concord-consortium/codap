import React, { useState } from "react"
import { Menu, MenuButton, MenuItem, MenuList, Tag, useDisclosure } from "@chakra-ui/react"
import OptionsIcon from "../../assets/icons/icon-options.svg"
import { useDocumentContent } from "../../hooks/use-document-content"
import t from "../../utilities/translation/translate"
import { kWebViewTileType } from "../web-view/web-view-defs"
import { isWebViewModel } from "../web-view/web-view-model"
import { WebViewUrlModal } from "../web-view/web-view-url-modal"

import "./tool-shelf.scss"

export const OptionsShelfButton = () => {
  const documentContent = useDocumentContent()
  const webViewModal = useDisclosure()
  const [webViewModalIsOpen, setWebViewModalIsOpen] = useState(false)

  const handleModalOpen = (open: boolean) => {
    setWebViewModalIsOpen(open)
  }

  const handleSetWebViewUrlOpen = () => {
    webViewModal.onOpen()
    handleModalOpen(true)
  }

  const handleSetWebViewUrlClose = () => {
    webViewModal.onClose()
    handleModalOpen(false)
  }

  const handleSetWebViewUrlAccept = (url: string) => {
    documentContent?.applyUndoableAction(() => {
      const tile = documentContent?.createOrShowTile?.(kWebViewTileType)
      isWebViewModel(tile?.content) && tile?.content.setUrl(url)
    }, "V3.Undo.webView.show", "V3.Redo.webView.show")
  }
  return (
    <>
      <Menu isLazy>
        <MenuButton
          className="tool-shelf-button menu web-view"
          title={t("DG.ToolButtonData.optionMenu.toolTip")}
          data-testid="tool-shelf-button-options"
        >
          <OptionsIcon />
          <Tag className="tool-shelf-tool-label web-view">{t("DG.ToolButtonData.optionMenu.title")}</Tag>
        </MenuButton>
        <MenuList>
          <MenuItem data-testid="tool-shelf-button-web-view" onClick={handleSetWebViewUrlOpen}>
            {t("DG.AppController.optionMenuItems.viewWebPage")}
          </MenuItem>
        </MenuList>
      </Menu>
      { webViewModalIsOpen &&
        <WebViewUrlModal
          isOpen={webViewModal.isOpen}
          onAccept={handleSetWebViewUrlAccept}
          onClose={handleSetWebViewUrlClose}
        />
      }
    </>
  )
}
